//
// This file defines the context entities.
//

//
// WorkItem
// E.g. US, Bug. i
// Source: azure-devops-node-api/interfaces/WorkItemTrackingInterfaces
//

//
// Represent the commit that bring the code associated in WorkItem in master or releases/* branch.
// In case of hotfixes or urgent US, they are integrated in both master and the releases/* branch by cherry-picking.
// This mean that the IntegratedCommit associated to such a WorkItem are usually 3.
// In the other cases, where not cherry-picking is involved, it is just one.
//
export type IntegratedCommit = string;

//
// ReleaseBranch from './release_branch'
// Some environments, e.g. UAT, PROD, requires that the Artifact originates i
// from a release branch. E.g. releases/*
//

//
// The entity that represent the release pipeline definition.
// In Azure Devops, for historical reasons, it is a Build Definition.
//
export interface ReleasePipeline {
    DefinitionId: number;
    DisplayName: string;
}

//
// At high level, a release pipeline is just a definition,
// while a run is an instance/concretization of that definition.
// In Azure Devops, for historical reasons, it corresponds to a Build,
// and its Number property to the BuildNumber.
//
export interface ReleasePipelineRun {
    Id: number;
    Number: string;
}

//
// It is a collection of resources where an Artifact could be placed.
// E.g. DEV, UAT, PROD...
//
export type Environment = string;

//
// It is a stage, in a ReleasePipelineRun,
// that bring an Artifact to a target Environment.
//
export interface Deployment {
    ReleasePipelineRun: ReleasePipelineRun;
    TargetEnvironment: Environment;
    FinishTime: Date;
}

export type EnvironmentsReport = {
    [key: Environment]: [ReleasePipelineRun, Date];
};
