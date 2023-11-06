import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
    Deployment,
    Environment,
    IntegratedCommit,
    ReleasePipelineRun,
    EnvironmentsReport,
} from "./Entities";
import { IEnvDeployHelper } from "./EnvDeployHelper";
import { ReleaseBranch } from "./ReleaseBranch";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking/WorkItemTrackingClient";
import { BuildRestClient } from "azure-devops-extension-api/Build/BuildClient";
import {
    WorkItem,
    WorkItemExpand,
} from "azure-devops-extension-api/WorkItemTracking";
import {
    GitBaseVersionDescriptor,
    GitRef,
    GitTargetVersionDescriptor,
    GitVersionOptions,
    GitVersionType,
} from "azure-devops-extension-api/Git";
import {
    BuildQueryOrder,
    TaskResult,
    TimelineRecordState,
} from "azure-devops-extension-api/Build";

export class DevopsExtEnvDeployHelper implements IEnvDeployHelper {
    _workItemClient: WorkItemTrackingRestClient;
    _gitClient: GitRestClient;
    _buildClient: BuildRestClient;

    _project: string;
    _repository: string;

    constructor(
        workItemClient: WorkItemTrackingRestClient,
        gitClient: GitRestClient,
        buildClient: BuildRestClient,
        project: string,
        repository: string
    ) {
        this._workItemClient = workItemClient;
        this._gitClient = gitClient;
        this._buildClient = buildClient;
        this._project = project;
        this._repository = repository;
    }

    async getIntegratedCommits(
        workItemId: number
    ): Promise<IntegratedCommit[]> {
        const regex = /^vstfs:\/\/\/Git\/Commit\/.*$/gm;

        let commitIds: IntegratedCommit[] = [];

        let workItem: WorkItem = await this._workItemClient.getWorkItem(
            workItemId,
            this._project,
            undefined,
            undefined,
            WorkItemExpand.Relations
        );

        let matches;

        const relations = workItem.relations ?? [];

        for (let relation of relations) {
            if (
                relation.rel === "ArtifactLink" &&
                (matches = relation.url?.match(regex))
            ) {
                let commitId = matches[0].split("%2f").reverse()[0];
                commitIds.push(commitId);
            }
        }
        return commitIds;
    }

    async getFirstReleaseBranch(
        integratedCommitId: IntegratedCommit,
        releaseBranchRefsPrefix: string
    ): Promise<ReleaseBranch | undefined> {
        let firstReleaseBranch: ReleaseBranch | undefined = undefined;

        let releaseRefs: GitRef[] = await this._gitClient.getRefs(
            this._repository,
            this._project,
            releaseBranchRefsPrefix
        );

        //
        // Sorting release branches from the first, that is the oldest,
        // to the last which is the newest.
        //
        let releaseBranches = releaseRefs
            .map((x) => new ReleaseBranch(x.name))
            .sort((b1, b2) => ReleaseBranch.compare(b1, b2));

        for (let releaseBranch of releaseBranches) {
            const baseDescriptor: GitBaseVersionDescriptor = {
                version: integratedCommitId,
                versionType: GitVersionType.Commit,
                versionOptions: GitVersionOptions.None,
                baseVersion: integratedCommitId,
                baseVersionType: GitVersionType.Commit,
                baseVersionOptions: GitVersionOptions.None,
            };

            const targetDescriptor: GitTargetVersionDescriptor = {
                version: releaseBranch.Name,
                versionType: GitVersionType.Branch,
                versionOptions: GitVersionOptions.None,
                targetVersion: releaseBranch.Name,
                targetVersionType: GitVersionType.Branch,
                targetVersionOptions: GitVersionOptions.None,
            };

            const diffResult = await this._gitClient.getCommitDiffs(
                this._repository,
                this._project,
                undefined,
                0,
                undefined,
                baseDescriptor,
                targetDescriptor
            );

            //
            // If the integrated commit is reachable from the current branch
            // - Remind that a git tree is a directed graph -
            // then the common commit has to be the integrated commit.
            //
            if (diffResult.commonCommit === integratedCommitId) {
                firstReleaseBranch = releaseBranch;
                break;
            }
        }

        return firstReleaseBranch;
    }

    getReleasePipelineRunNumber(releaseBranch: ReleaseBranch): string {
        return `${releaseBranch.MajorNumber}.${releaseBranch.MinorNumber}`;
    }

    async getDeployments(
        runNumberPrefix: string,
        releasePipelineDefinitionId: number,
        excludedStages: string[]
    ): Promise<Deployment[]> {
        let allDeployments: Deployment[] = [];

        let releasePipelineRuns: ReleasePipelineRun[] = (
            await this._buildClient.getBuilds(
                this._project,
                [releasePipelineDefinitionId],
                undefined,
                runNumberPrefix,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                BuildQueryOrder.FinishTimeAscending,
                undefined,
                undefined,
                undefined,
                undefined
            )
        ).map<ReleasePipelineRun>((x) => ({
            Id: x.id!,
            Number: x.buildNumber!,
        }));

        for (let run of releasePipelineRuns) {
            let timeline = await this._buildClient.getBuildTimeline(
                this._project,
                run.Id
            );

            if (timeline.records === undefined) continue;

            let deployments: Deployment[] = timeline.records
                .filter(
                    (x) =>
                        x.type === "Stage" &&
                        x.name !== undefined &&
                        !excludedStages.includes(x.name) &&
                        x.state === TimelineRecordState.Completed &&
                        (x.result === TaskResult.Succeeded ||
                            x.result === TaskResult.SucceededWithIssues) &&
                        x.finishTime !== undefined
                )
                .map<Deployment>((tr) => ({
                    FinishTime: tr.finishTime!,
                    ReleasePipelineRun: run,
                    TargetEnvironment: tr.name!,
                }));

            allDeployments = allDeployments.concat(deployments);
        }

        return allDeployments;
    }

    getDeploymentEnvironmentReport(
        deployments: Deployment[],
        environments: Environment[]
    ): EnvironmentsReport {
        let report: EnvironmentsReport = {};

        for (let env of environments) {
            let firstDeployment = deployments
                .filter((d) => d.TargetEnvironment === env)
                .sort(
                    (d1, d2) =>
                        d1.FinishTime.getTime() - d2.FinishTime.getTime()
                )
                .at(0);

            if (firstDeployment !== undefined) {
                report[env] = [
                    firstDeployment.ReleasePipelineRun,
                    firstDeployment.FinishTime,
                ];
            }
        }

        return report;
    }
}
