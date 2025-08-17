import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lex from "aws-cdk-lib/aws-lex";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface LexBotStackProps extends cdk.StackProps {
  chatLambdaArn: string;
}

export class LexBotStack extends cdk.Stack {
  public readonly lexBot: lex.CfnBot;
  public readonly lexBotAlias: lex.CfnBotAlias;

  constructor(scope: Construct, id: string, props: LexBotStackProps) {
    super(scope, id, props);

    // IAM role for Lex bot
    const lexBotRole = new iam.Role(this, "LexBotRole", {
      assumedBy: new iam.ServicePrincipal("lexv2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonLexFullAccess"),
      ],
      inlinePolicies: {
        LambdaInvokePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["lambda:InvokeFunction"],
              resources: [props.chatLambdaArn],
            }),
          ],
        }),
      },
    });

    // Mental Health Companion Lex Bot
    this.lexBot = new lex.CfnBot(this, "MentalHealthCompanionBot", {
      name: "MentalHealthCompanion",
      description:
        "AI-powered mental health support bot for campus communities",
      roleArn: lexBotRole.roleArn,
      dataPrivacy: {
        childDirected: false,
      },
      idleSessionTtlInSeconds: 1800, // 30 minutes session timeout

      botLocales: [
        {
          localeId: "en_US",
          description: "English (US) locale for mental health support",
          nluConfidenceThreshold: 0.4, // Lower threshold for better intent recognition

          // Define intents for mental health conversations
          intents: [
            {
              name: "AnxietySupport",
              description: "Handle anxiety-related conversations",
              sampleUtterances: [
                { utterance: "I'm feeling anxious" },
                { utterance: "I have anxiety" },
                { utterance: "I'm worried about everything" },
                { utterance: "I can't stop thinking about bad things" },
                { utterance: "My heart is racing and I feel nervous" },
                { utterance: "I'm having a panic attack" },
                { utterance: "I feel overwhelmed with worry" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "DepressionSupport",
              description: "Handle depression-related conversations",
              sampleUtterances: [
                { utterance: "I'm feeling sad" },
                { utterance: "I feel depressed" },
                { utterance: "I don't want to do anything" },
                { utterance: "Everything feels hopeless" },
                { utterance: "I don't have energy for anything" },
                { utterance: "I feel empty inside" },
                { utterance: "Nothing makes me happy anymore" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "StressManagement",
              description: "Handle stress-related conversations",
              sampleUtterances: [
                { utterance: "I'm stressed out" },
                { utterance: "I have too much pressure" },
                { utterance: "I can't handle all this work" },
                { utterance: "I'm overwhelmed with school" },
                { utterance: "Everything is too much right now" },
                { utterance: "I need help managing stress" },
                { utterance: "I'm burnt out" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "CrisisIntervention",
              description: "Handle crisis situations and suicidal ideation",
              sampleUtterances: [
                { utterance: "I want to hurt myself" },
                { utterance: "I don't want to live anymore" },
                { utterance: "I'm thinking about suicide" },
                { utterance: "I want to end it all" },
                { utterance: "I can't go on like this" },
                { utterance: "Everyone would be better without me" },
                { utterance: "I feel like giving up" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "GeneralWellbeing",
              description:
                "Handle general mental health and wellbeing conversations",
              sampleUtterances: [
                { utterance: "How are you" },
                { utterance: "I need someone to talk to" },
                { utterance: "I'm having a bad day" },
                { utterance: "Can you help me" },
                { utterance: "I don't feel good" },
                { utterance: "I need support" },
                { utterance: "I'm struggling" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "AppointmentBooking",
              description: "Handle appointment scheduling requests",
              sampleUtterances: [
                { utterance: "I want to book an appointment" },
                { utterance: "Can I see a counselor" },
                { utterance: "I need to talk to someone professional" },
                { utterance: "Schedule a therapy session" },
                { utterance: "I want to meet with a therapist" },
                { utterance: "Book me with a mental health professional" },
              ],
              slots: [
                {
                  name: "AppointmentDate",
                  description: "Date for the appointment",
                  slotTypeName: "AMAZON.Date",
                  valueElicitationSetting: {
                    slotConstraint: "Optional",
                    promptSpecification: {
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                "What date would you prefer for your appointment?",
                            },
                          },
                        },
                      ],
                      maxRetries: 3,
                      allowInterrupt: true,
                    },
                  },
                },
                {
                  name: "AppointmentTime",
                  description: "Time for the appointment",
                  slotTypeName: "AMAZON.Time",
                  valueElicitationSetting: {
                    slotConstraint: "Optional",
                    promptSpecification: {
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: "What time would work best for you?",
                            },
                          },
                        },
                      ],
                      maxRetries: 3,
                      allowInterrupt: true,
                    },
                  },
                },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "ResourceRequests",
              description: "Handle requests for mental health resources",
              sampleUtterances: [
                { utterance: "What resources are available" },
                { utterance: "I need help finding support" },
                { utterance: "What services do you offer" },
                { utterance: "Can you give me some coping strategies" },
                { utterance: "I need breathing exercises" },
                { utterance: "What can I do to feel better" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            // Fallback intent
            {
              name: "FallbackIntent",
              description: "Default intent when no other intent is recognized",
              parentIntentSignature: "AMAZON.FallbackIntent",
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
          ],
        },
      ],

      // Auto-build the bot when changes are made
      autoBuildBotLocales: true,
    });

    // Create bot version and alias for production use
    const botVersion = new lex.CfnBotVersion(this, "MhcBotVersion", {
      botId: this.lexBot.attrId,
      botVersionLocaleSpecification: [
        {
          localeId: "en_US",
          botVersionLocaleDetails: {
            sourceBotVersion: "DRAFT",
          },
        },
      ],
    });

    // Production bot alias
    this.lexBotAlias = new lex.CfnBotAlias(this, "MhcBotAlias", {
      botId: this.lexBot.attrId,
      botAliasName: "Production",
      description: "Production alias for Mental Health Companion bot",
      botVersion: botVersion.attrBotVersion,

      // Configure Lambda fulfillment
      botAliasLocaleSettings: [
        {
          localeId: "en_US",
          botAliasLocaleSetting: {
            enabled: true,
            codeHookSpecification: {
              lambdaCodeHook: {
                lambdaArn: props.chatLambdaArn,
                codeHookInterfaceVersion: "1.0",
              },
            },
          },
        },
      ],
    });

    // Grant Lambda permission to be invoked by Lex
    const lexInvokePermission = new lambda.CfnPermission(
      this,
      "LexInvokePermission",
      {
        functionName: props.chatLambdaArn,
        action: "lambda:InvokeFunction",
        principal: "lexv2.amazonaws.com",
        sourceArn: `arn:aws:lex:${this.region}:${this.account}:bot-alias/${this.lexBot.attrId}/${this.lexBotAlias.attrBotAliasId}`,
      }
    );

    // Outputs for other stacks
    new cdk.CfnOutput(this, "LexBotId", {
      value: this.lexBot.attrId,
      description: "Mental Health Companion Lex Bot ID",
      exportName: "MhcLexBotId",
    });

    new cdk.CfnOutput(this, "LexBotAliasId", {
      value: this.lexBotAlias.attrBotAliasId,
      description: "Mental Health Companion Lex Bot Alias ID",
      exportName: "MhcLexBotAliasId",
    });

    new cdk.CfnOutput(this, "LexBotArn", {
      value: this.lexBot.attrArn,
      description: "Mental Health Companion Lex Bot ARN",
      exportName: "MhcLexBotArn",
    });
  }
}
