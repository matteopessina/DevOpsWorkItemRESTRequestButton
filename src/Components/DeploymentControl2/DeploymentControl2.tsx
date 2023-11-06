import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
    IWorkItemFormService,
    WorkItemTrackingServiceIds,
} from "azure-devops-extension-api/WorkItemTracking/";
import {
    GitServiceIds,
    IVersionControlRepositoryService,
} from "azure-devops-extension-api/Git/GitServices";
import { Card } from "azure-devops-ui/Card";
import { showRootComponent } from "../../Common";
import { DevopsExtEnvDeployHelper } from "./DevopsExtEnvDeployHelper";
import { GitRestClient } from "azure-devops-extension-api/Git";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import { BuildRestClient } from "azure-devops-extension-api/Build";
import { getClient } from "azure-devops-extension-api/Common";
import { Deployment, EnvironmentsReport } from "./Entities";

type DeploymentControl2Props = {};

type DeploymentControl2State = {
    EnvironmentsReport: EnvironmentsReport | undefined;
};

class DeploymentControl2 extends React.Component<
    DeploymentControl2Props,
    DeploymentControl2State
> {
    state: DeploymentControl2State = {
        EnvironmentsReport: undefined,
    };

    constructor(props: {}) {
        super(props);
    }

    public async componentDidMount(): Promise<void> {
        await SDK.init({ loaded: false });
        console.log("SDK:init");
        let workItemFormService = await SDK.getService<IWorkItemFormService>(
            WorkItemTrackingServiceIds.WorkItemFormService
        );
        SDK.getService<IVersionControlRepositoryService>(
            GitServiceIds.VersionControlRepositoryService
        );
        const workItemId = await workItemFormService.getId();
        console.log(`CurrentItemId: ${workItemId}`);

        // SDK.register(SDK.getContributionId(), () => {});
        // await SDK.ready();

        //TODO: retrive this hardcoded info
        const project = "temp2";
        const repo = "temp2";
        const workItemClient = getClient(WorkItemTrackingRestClient);
        const gitClient = getClient(GitRestClient);
        const buildClient = getClient(BuildRestClient);

        const envDeployHelper = new DevopsExtEnvDeployHelper(
            workItemClient,
            gitClient,
            buildClient,
            project,
            repo
        );

        let integratedCommitIds = await envDeployHelper.getIntegratedCommits(
            workItemId
        );

        let allDeployments: Deployment[] = [];

        for (let integratedCommitId of integratedCommitIds) {
            let firstReleaseBranch =
                await envDeployHelper.getFirstReleaseBranch(
                    integratedCommitId,
                    "heads/releases/"
                );

            if (firstReleaseBranch === undefined) continue;

            let runNumber =
                envDeployHelper.getReleasePipelineRunNumber(firstReleaseBranch);

            let runNumberPrefix = `${runNumber}*`;

            // TODO: refactor
            const contactsReleasePipelineId = 4;

            let deployments = await envDeployHelper.getDeployments(
                runNumberPrefix,
                contactsReleasePipelineId,
                ["Setup"]
            );

            allDeployments = allDeployments.concat(deployments);
        }

        let report = envDeployHelper.getDeploymentEnvironmentReport(
            allDeployments,
            ["Tier0", "Tier2"]
        );

        for (let env in report) {
            console.log(
                `WorkItem ${workItemId}\tEnv ${env}\tRunNumber ${report[env][0].Number}\tDateTime: ${report[env][1]}`
            );
        }

        this.setState({
            EnvironmentsReport: report,
        });

        console.log("SDK:ready");
        SDK.notifyLoadSucceeded();
        SDK.resize();
    }

    public render(): JSX.Element {
        console.log("render!");
        return (
            <Card className="flex-grow">
                {this.state.EnvironmentsReport === undefined
                    ? "Tier0 not deployed"
                    : "Tier0\t" +
                      this.state.EnvironmentsReport["Tier0"][0].Number +
                      "\t" +
                      this.state.EnvironmentsReport["Tier0"][1].toDateString()}
                <br />
                {this.state.EnvironmentsReport === undefined
                    ? "Tier2 not deployed"
                    : "Tier2\t" +
                      this.state.EnvironmentsReport["Tier2"][0].Number +
                      "\t" +
                      this.state.EnvironmentsReport["Tier2"][1].toDateString()}
            </Card>
        );
    }
}

export default DeploymentControl2;
showRootComponent(<DeploymentControl2 />);
