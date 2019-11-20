"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deployStack = deployStack;
exports.describeStack = describeStack;
exports.destroyStack = destroyStack;
exports.withStack = withStack;

var _diff = require("aws-cdk/lib/diff");

var _settings = require("aws-cdk/lib/settings");

var _cdkToolkit = require("aws-cdk/lib/cdk-toolkit");

var _stacks = require("aws-cdk/lib/api/cxapp/stacks");

var _deploymentTarget = require("aws-cdk/lib/api/deployment-target");

var _credentials = require("aws-cdk/lib/api/aws-auth/credentials");

var _sdk = require("aws-cdk/lib/api/util/sdk");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const cfn = require('aws-cdk/lib/api/util/cloudformation');
/**
 * CDK context
 */


class CdkContext {
  constructor(app, name, exclusively, tags = [], aws = new _sdk.SDK({
    ec2creds: true
  })) {
    this.app = app;
    this.name = name;
    this.exclusively = exclusively;
    this.tags = tags;
    this.aws = aws;

    _defineProperty(this, "config", void 0);

    _defineProperty(this, "appStacks", void 0);

    _defineProperty(this, "cdkToolkit", void 0);

    _defineProperty(this, "provisioner", void 0);

    this.config = new _settings.Configuration({});
    this.appStacks = new _stacks.AppStacks({
      configuration: this.config,
      synthesizer: async () => this.app.synth(),
      aws: this.aws,
      ignoreErrors: false,
      verbose: true,
      strict: true
    });
    this.provisioner = new _deploymentTarget.CloudFormationDeploymentTarget({
      aws: this.aws
    });
    this.cdkToolkit = new _cdkToolkit.CdkToolkit({
      appStacks: this.appStacks,
      provisioner: this.provisioner
    });
  }

  async deploy() {
    await this.config.load();
    await this.cdkToolkit.deploy({
      stackNames: [this.name],
      exclusively: this.exclusively,
      tags: this.tags,
      sdk: this.aws,
      // roleArn: args.roleArn,
      requireApproval: _diff.RequireApproval.Never // ci: args.ci,
      // reuseAssets: args['build-exclude'],

    });
  }

  async destroy() {
    await this.config.load();
    await this.cdkToolkit.destroy({
      // roleArn: args.roleArn,
      stackNames: [this.name],
      exclusively: this.exclusively,
      sdk: this.aws,
      force: true
    });
  }

  async describe() {
    await this.config.load();
    const stackList = await this.appStacks.selectStacks([this.name], {
      extend: this.exclusively ? _stacks.ExtendedStackSelection.None : _stacks.ExtendedStackSelection.Upstream,
      defaultBehavior: _stacks.DefaultSelection.OnlySingle
    });

    if (stackList.length === 0) {
      throw Error(`No stacks found by name ${this.name}`);
    }

    const stack = stackList[0];
    const cfnClient = await this.aws.cloudFormation(stack.environment.account, stack.environment.region, _credentials.Mode.ForWriting);
    const descr = await cfn.describeStack(cfnClient, this.name);
    return {
      environment: {
        account: stack.environment.account,
        region: stack.environment.region
      },
      stack: descr
    };
  }

}

async function deployStack(props) {
  const {
    app,
    name,
    exclusively
  } = props;
  console.info(`+++ Deploying AWS CDK app ${name} exclusively ${exclusively}`);
  const cdkCtx = await new CdkContext(app, name, exclusively);
  await cdkCtx.deploy();
}

async function describeStack(props) {
  const {
    app,
    name,
    exclusively
  } = props;
  const cdkCtx = await new CdkContext(app, name, exclusively);
  return await cdkCtx.describe();
}

async function destroyStack(props) {
  const {
    app,
    name,
    exclusively
  } = props;
  console.info(`--- Destroying AWS CDK app ${name} exclusively ${exclusively}`);
  const cdkCtx = await new CdkContext(app, name, exclusively);
  await cdkCtx.destroy();
}

function withStack(props, block) {
  return done => {
    describeStack(props).then(block).then(() => done()).catch(err => done(err));
  };
}
//# sourceMappingURL=index.js.map