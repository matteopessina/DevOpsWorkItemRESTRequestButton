import {
    Deployment,
    Environment,
    EnvironmentsReport,
    IntegratedCommit,
} from "./Entities";
import { ReleaseBranch } from "./ReleaseBranch";

export interface IEnvDeployHelper {
    getIntegratedCommits(workItemId: number): Promise<IntegratedCommit[]>;
    getFirstReleaseBranch(
        integratedCommitId: IntegratedCommit,
        releaseBranchRefsPrefix: string
    ): Promise<ReleaseBranch | undefined>;
    getReleasePipelineRunNumber(releaseBranch: ReleaseBranch): string;
    getDeployments(
        runNumberPrefix: string,
        releasePipelineDefinitionId: number,
        excludedStages: string[]
    ): Promise<Deployment[]>;
    getDeploymentEnvironmentReport(
        deployments: Deployment[],
        environments: Environment[]
    ): EnvironmentsReport;
}
