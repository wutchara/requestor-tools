import {
  ActivityTypes,
  AdaptiveCardInvokeResponse,
  AdaptiveCardInvokeValue,
  CloudAdapter,
  ConversationState,
  InvokeResponse,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  SigninStateVerificationQuery,
  StatePropertyAccessor,
  TaskModuleRequest,
  TaskModuleResponse,
  TeamsActivityHandler,
  TurnContext,
  UserState,
} from 'botbuilder';
import { get } from 'lodash';
import { Application } from '@microsoft/teams-ai';
import { AuthorizedDialog } from './dialogs/authorized-dialog';
import { NextFunction, Request } from 'express';
import { Injectable, Scope } from '@nestjs/common';
import {
  IBotBaseCommand,
  IHaveAdaptiveCardInvoke,
  OthersCommand,
} from '../../command';
import {
  AAAService,
  getLocalAppId,
  getNodeEnv,
  getRequestIdFromContext,
  getRequestIdFromRequest,
  TokenService,
} from '../shared';

import { HandlerAction } from './handler';

import { CustomLoggerService } from '../../modules/logger/custom-logger.service';
import {
  IBotBaseMessageExtension,
  IMessageExtSelectedItemArgs,
} from '../../message-extension/type';
import {
  BotBaseMessageExtension,
  IHaveSelectedItemEvent,
} from '../../message-extension/base';

import {
  // signinWithSSOInRefreshTemplate,
  consentTemplate,
  signinResponseTemplate,
} from '../../command/templates/signin-template';

import '../../invoke';

import { CommandRegisterService } from '../../modules/commands/command-register.service';
import { InvokeActivityBase } from '../../invoke/base';

@Injectable({
  scope: Scope.REQUEST,
})
export class DialogBot extends TeamsActivityHandler {
  private conversationState: ConversationState;
  private userState: UserState;
  private dialog: AuthorizedDialog;
  private dialogState: StatePropertyAccessor;
  private _commands: IBotBaseCommand[];
  private _messageExtensions: IBotBaseMessageExtension[];
  private _application: Application;
  private tokenService: TokenService;

  constructor(
    private readonly logger: CustomLoggerService,
    commands: IBotBaseCommand[],
    messageExtensions: IBotBaseMessageExtension[],
    private readonly commandRegistry: CommandRegisterService,
  ) {
    super();

    this.tokenService = new TokenService();
    this._commands = commands;
    this._messageExtensions = messageExtensions;
    this.onMessage(this.handleOnMessage.bind(this));
  }

  public configure(
    conversationState: ConversationState,
    userState: UserState,
    dialog: AuthorizedDialog,
    application: Application,
  ) {
    this.conversationState = conversationState;
    this.userState = userState;
    this.dialog = dialog;
    this._application = application;

    this.dialogState = this.conversationState.createProperty('DialogState');

    this.onMessage(async (context: TurnContext, next: NextFunction) => {
      await next();
    });
  }

  public override async run(context: TurnContext): Promise<void> {
    const requestId: string = getRequestIdFromContext(context);
    this.logger.log({
      message: `Running with requestId: ${requestId}`,
      id: requestId,
    });

    await super.run(context);

    await this.conversationState.saveChanges(context);
    await this.userState.saveChanges(context);
  }

  public async runWithRequest(
    context: TurnContext,
    req: Request,
  ): Promise<void> {
    const requestId = getRequestIdFromRequest(req);
    this.logger.log({
      message: 'DialogBot:runWithRequest=====================',
      id: requestId,
    });

    // get body from request
    const body = req.body;
    // const body = (await req.json()) as Record<string, unknown>;
    this.logger.log({
      message:
        'DialogBot:runWithRequest=====================: ' +
        JSON.stringify(body),
      id: requestId,
    });

    // Add requestId to the context's turnState
    context.turnState.set('requestId', requestId);

    // const aiCondition = new RegExp(`^(${process.env.AI_LIBRARY_PREFIX})`, 'i');
    // this.logger.log({
    //   message:
    //     '======== RUN =========:body.text:' +
    //     body?.text +
    //     ', aiCondition.test(body.text):' +
    //     aiCondition.test(body.text),
    //   id: requestId,
    // });

    // if (
    //   process.env.AI_LIBRARY_PREFIX &&
    //   body?.text &&
    //   aiCondition.test(body.text)
    // ) {
    //   this.logger.log({
    //     message:
    //       '======== RUN =========process.env.ENABLED_AI_LIBRARY' +
    //       process.env.ENABLED_AI_LIBRARY,
    //     id: requestId,
    //   });

    //   if (process.env.ENABLED_AI_LIBRARY === 'true') {
    //     await this._application.run(context);
    //   }
    // } else {
    this.logger.log({
      message: 'DialogBot:runWithRequest:runWithoutAuthen',
      id: requestId,
    });
    await this.run(context);
    // }
  }

  private cleanUpText(context: TurnContext): string {
    // return commandIn.replace(/<at>.*<\/at>/g, '').trim();
    return TurnContext.removeRecipientMention(context.activity);
  }

  // private createAdaptiveCardInvokeResponseAsync(
  //   authentication,
  //   state,
  //   context,
  // ): AdaptiveCardInvokeResponse {
  //   let isTokenPresent = authentication != null;
  //   let isStatePresent = state !== undefined && state !== '';

  //   const template = new ACData.Template(signinResponseTemplate.content);

  //   const authResultData = isTokenPresent
  //     ? 'SSO success'
  //     : isStatePresent
  //       ? 'OAuth success'
  //       : 'SSO/OAuth failed';

  //   const payloadData = {
  //     authresult: authResultData,
  //   } as ACData.IEvaluationContext;

  //   const card = template.expand(payloadData);

  //   return {
  //     statusCode: 200,
  //     type: 'application/vnd.microsoft.card.adaptive',
  //     value: card,
  //   };
  // }

  // private async getSigninLink(context) {
  //   const adapter = context.adapter as CloudAdapter;
  //   const userTokenClient = context.turnState.get(adapter.UserTokenClientKey);

  //   if (!userTokenClient) {
  //     throw new Error(
  //       'UserTokenClient not found in turn state. Ensure CloudAdapter is set up correctly.',
  //     );
  //   }

  //   const signInResource = await userTokenClient.getSignInResource(
  //     process.env.BOT_CONNECTION_NAME,
  //     context.activity,
  //   );
  //   const signInLink = signInResource.signInLink;

  //   return signInLink;
  // }

  private async commandHandlers(context: TurnContext) {
    // if (context.activity?.value?.commandId === 'PerformSSO') {
    //   const signInLink = await this.getSigninLink(context);
    //   signinWithSSOInRefreshTemplate.content.authentication.buttons[0].value =
    //     signInLink ? signInLink : '';
    //   await context.sendActivity({
    //     attachments: [signinWithSSOInRefreshTemplate],
    //   });

    //   return;
    // }

    const text =
      this.cleanUpText(context) || get(context, 'activity.value.commandId');
    const requestId: string = getRequestIdFromContext(context);
    this.logger.log({
      message: `commandHandlers:txt: ${text}`,
      id: requestId,
    });

    if (
      context?.activity?.value?.commandId?.trim().toLowerCase() === 'consent'
    ) {
      this.logger.log({
        message: `commandHandlers:Consent:`,
        id: requestId,
      });
      const msftToken = await this.tokenService.fetchMicrosoftToken(context);
      this.logger.log({
        message: `commandHandlers:Consent:msftToken:` + msftToken,
        id: requestId,
      });

      if (msftToken) {
        this.logger.warn({
          message: `[Found] commandHandlers:Consent:msftToken:`,
          id: requestId,
        });

        const heimdalAccessToken =
          await this.tokenService.fetchHeimdallAccessToken(context, msftToken);

        if (heimdalAccessToken) {
          // Thank you card
          await context.sendActivity({
            attachments: [signinResponseTemplate],
          });
        } else {
          this.logger.warn({
            message: `[MISSING] commandHandlers:Consent:heimdalAccessToken:`,
            id: requestId,
          });
        }
      } else {
        // throw new Error('Missing Microsoft token');
        this.logger.warn({
          message: `[MISSING] commandHandlers:Consent:msftToken:`,
          id: requestId,
        });
      }

      return;
    }

    const msCommands = ['logout'];
    if (msCommands.includes(text)) {
      this.logger.warn({
        message: `commandHandlers:ignore MS commands: ${text}`,
        id: requestId,
      });

      return;
    }

    const commandLen = this._commands.length;

    for (let i = 0; i < commandLen; i++) {
      const commandObj = this._commands[i];
      const commandPatterns = commandObj.commandPatterns;
      this.logger.log({
        message: `commandPatterns: ${commandPatterns}, text: ${text}, commandPatterns.test(text): ${commandPatterns.test(text)}`,
        id: requestId,
      });

      if (commandPatterns.test(text)) {
        this.logger.log({
          message: 'commandHandlers:processing....',
          id: requestId,
        });

        // replace text
        context.activity.text = text;

        // running command without ai-insight proxy
        if (commandObj instanceof OthersCommand) {
          this.logger.log({
            message: 'commandHandlers:running command without ai-insight proxy',
            id: requestId,
          });

          const aaaService = new AAAService(this.tokenService);
          const aaaData = await aaaService.getSettings(context, [
            'SETTING.WSTEAMS.BOT.AI_LIBRARY.ACCESS',
          ]);
          this.logger.log({
            message: 'AAA data: ' + JSON.stringify(aaaData),
            id: requestId,
          });
          const aiLibEnabled = aaaData[0]?.value || false;

          // TODO: AI libary enabled
          // TODO: support AAA setting
          if (process.env.ENABLED_AI_LIBRARY === 'true' && aiLibEnabled) {
            this.logger.log({
              message: 'AI library enabled',
              id: requestId,
            });

            console.log('=====================');
            console.log('AI library enabled');
            console.log('=====================');
            await this._application.run(context);
          } else {
            // ai-insight proxy
            this.logger.log({
              message: 'AI library disabled',
              id: requestId,
            });

            const response = await commandObj.handleCommand(context);
            this.logger.log(
              {
                message: `commandHandlers:response:AI-Insight:`,
                id: requestId,
              },
              response,
            );
          }
          break;
        }

        const response = await commandObj.handleCommand(context);
        this.logger.log(
          {
            message: `commandHandlers:response:`,
            id: requestId,
          },
          response,
        );

        break;
      }
    }
  }

  // // Handle adaptive card actions
  // public async onAdaptiveCardInvoke(
  //   context: TurnContext,
  //   invokeValue: AdaptiveCardInvokeValue,
  // ): Promise<AdaptiveCardInvokeResponse> {
  //   const verb = invokeValue.action.verb;

  //   try {
  //     const handler = this._commands.find((command) =>
  //       (command as IBotBaseCommand & IHaveAdaptiveCardInvoke).verbs?.includes(
  //         verb,
  //       ),
  //     ) as IBotBaseCommand & IHaveAdaptiveCardInvoke;

  //     if (handler) {
  //       return handler.onAdaptiveCardInvoke(context, invokeValue);
  //     } else {
  //       const value = context.activity.value;
  //       let authentication = null;

  //       if (value['authentication'] != null) {
  //         authentication = value['authentication'];
  //       }

  //       let state = null;
  //       if (value['state'] != null) {
  //         state = value['state'].toString();
  //       }

  //       if (authentication || state) {
  //         return this.createAdaptiveCardInvokeResponseAsync(
  //           authentication,
  //           state,
  //           context,
  //         );
  //       }
  //     }

  //     return {} as any;
  //   } catch (err) {
  //     return createActionErrorResponse(500, 0, err.message);
  //   }
  // }

  // private async validateMicrosoftToken(context: TurnContext) {
  //   // check MSFT token
  //   this.logger.log({
  //     message: `handleOnMessage:msftToken: geting Microsoft token.....`,
  //     id: getRequestIdFromContext(context),
  //   });

  //   try {
  //     const msftToken = await this.tokenService.fetchMicrosoftToken(context);
  //     this.logger.log({
  //       message: `handleOnMessage:msftToken: ${msftToken}`,
  //       id: getRequestIdFromContext(context),
  //     });

  //     if (!msftToken) {
  //       this.logger.warn({
  //         message: `handleOnMessage:msftToken is missing`,
  //         id: getRequestIdFromContext(context),
  //       });
  //       await context.sendActivity({
  //         attachments: [consentTemplate()],
  //       });

  //       return;
  //     }
  //   } catch (e) {
  //     console.error('error - msft token', e);
  //     await context.sendActivity({
  //       attachments: [consentTemplate()],
  //     });
  //   }
  // }

  protected async handleTeamsSigninVerifyState(
    _context: TurnContext,
    _query: SigninStateVerificationQuery,
  ): Promise<void> {
    this.logger.log({
      message:
        'Running dialog with signin/verifystate from an Invoke Activity.',
      id: getRequestIdFromContext(_context),
    });

    await this.dialog.run(_context, this.dialogState);
  }

  protected async handleTeamsSigninTokenExchange(
    _context: TurnContext,
    _query: SigninStateVerificationQuery,
  ): Promise<void> {
    this.logger.log({
      message:
        'Running dialog with signin/tokenExchange from an Invoke Activity.',
      id: getRequestIdFromContext(_context),
    });
    await this.dialog.run(_context, this.dialogState);
  }

  private async handleOnMessage(
    context: TurnContext,
    next: () => Promise<void>,
  ) {
    if (
      getNodeEnv() !== 'local' &&
      context.activity.recipient.id !== getLocalAppId()
    ) {
      // await this.validateMicrosoftToken(context);
      await this.dialog.run(context, this.dialogState);
    }

    await context.sendActivity({ type: ActivityTypes.Typing });
    await this.commandHandlers(context);

    await next();
  }

  protected override async handleTeamsMessagingExtensionQuery(
    context: TurnContext,
    query: MessagingExtensionQuery,
  ): Promise<MessagingExtensionResponse> {
    const command = query.commandId;
    const requestId: string = getRequestIdFromContext(context);
    this.logger.log({
      message: `handleTeamsMessagingExtensionQuery:commandId: ${command}`,
      id: requestId,
    });

    try {
      if (command) {
        const messageExtHandler = this._messageExtensions.find(
          (ext) => ext.commandId === command,
        ) as BotBaseMessageExtension;

        if (messageExtHandler) {
          const result = messageExtHandler.handleMessageExtension(
            context,
            query,
          );

          return result;
        }
      }
    } catch (e) {
      this.logger.error({
        message: `handleTeamsMessagingExtensionQuery:error`,
        error: e,
        id: requestId,
      });
    }

    return {};
  }

  protected override async handleTeamsMessagingExtensionSelectItem(
    context: TurnContext,
    query: IMessageExtSelectedItemArgs<any>,
  ): Promise<MessagingExtensionResponse> {
    const command = query.id;
    const requestId: string = getRequestIdFromContext(context);
    this.logger.log({
      message: `handleTeamsMessagingExtensionSelectItem:commandId: ${command}`,
      id: requestId,
    });

    try {
      if (command) {
        const messageExtHandler = this._messageExtensions.find(
          (ext) => ext.commandId === command,
        ) as BotBaseMessageExtension & IHaveSelectedItemEvent<any>;

        if (messageExtHandler) {
          const result = messageExtHandler.handleMessageExtensionSelectedItem(
            context,
            query,
          );

          return result;
        }
      }
    } catch (e) {
      this.logger.error({
        message: `handleTeamsMessagingExtensionSelectItem:error`,
        error: e,
        id: requestId,
      });
    }

    return {};
  }

  protected async handleTeamsTaskModuleFetch(
    context: TurnContext,
    taskModuleRequest: TaskModuleRequest,
  ): Promise<TaskModuleResponse> {
    this.logger.log({
      message: 'handleTeamsTaskModuleFetch',
      id: getRequestIdFromContext(context),
    });

    const data = taskModuleRequest.data as { commandId: string };

    const instance = this.commandRegistry.get<InvokeActivityBase>(
      data.commandId,
    );

    const result = await instance.onTaskFetch(context, taskModuleRequest);

    return result;
  }

  protected async handleTeamsTaskModuleSubmit(
    context: TurnContext,
    taskModuleRequest: TaskModuleRequest,
  ): Promise<TaskModuleResponse> {
    this.logger.log({
      message: 'handleTeamsTaskModuleSubmit',
      id: getRequestIdFromContext(context),
    });

    const data = taskModuleRequest.data as { commandId: string };

    const instance = this.commandRegistry.get<InvokeActivityBase>(
      data.commandId,
    );

    const result = await instance.onTaskSubmit(context, taskModuleRequest);

    return result;
  }
}
