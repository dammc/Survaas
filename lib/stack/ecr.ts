import { Stack, StackProps } from 'aws-cdk-lib';
import * as path from 'path';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
/**
 * Stack that creates and manages Docker image assets for the survey application
 * @extends Stack
 */
export class SurveyImageStack extends Stack {

    /**
     * The Docker image asset for the survey application
     * @type {ecr_assets.DockerImageAsset}
     */
    public readonly surveyImage: ecr_assets.DockerImageAsset;

    /**
     * Creates a new SurveyImageStack
     * @param {Construct} scope - The scope in which to define this construct
     * @param {string} id - The scoped construct ID
     * @param {StackProps} props - Stack properties
     */
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // docker context directory
        const dockerContextPath = path.join(__dirname, '../../docker');

        // upload images to ecr
        this.surveyImage = new ecr_assets.DockerImageAsset(this, 'SurveyImage', {
            directory: dockerContextPath,
            file: 'Docker.survey',
        })
    }
};