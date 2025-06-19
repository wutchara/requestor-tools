import {
  ConfirmPrompt,
  DialogSet,
  DialogTurnStatus,
  OAuthPrompt,
  WaterfallDialog,
  WaterfallStepContext,
} from 'botbuilder-dialogs';
import { LogoutDialog } from './logout-dialog';
import { StatePropertyAccessor, TurnContext } from 'botbuilder';
import {
  consentTemplate,
  signinTemplate,
} from '../../../command/templates/signin-template';
import { TokenService } from 'src/services/shared';
import { SigninError } from 'src/errors';

// TODO: add id to log
const MAIN_WATERFALL_DIALOG = 'WaterfallDialog';
const OAUTH_PROMPT_DIALOG = 'OAuthPrompt';

export class AuthorizedDialog extends LogoutDialog {
  constructor(dialogName: string, connectionName: string) {
    super(dialogName, connectionName);
    console.log('dialogName', dialogName);
    console.log('connectionName', connectionName);

    this.addDialog(
      new OAuthPrompt(OAUTH_PROMPT_DIALOG, {
        connectionName,
        text:
          process.env.SIGN_TITLE ||
          "Please click 'I agree' to authorise Workspace to use your Microsoft account details.",
        title: process.env.SIGN_BUTTON || 'I agree',
        timeout: 300000,
      }),
    );
    this.addDialog(
      new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
        this.promptStep.bind(this),
        this.loginStep.bind(this),
      ]),
    );

    this.initialDialogId = MAIN_WATERFALL_DIALOG;
  }

  private async promptStep(stepContext: WaterfallStepContext) {
    console.log('AuthorizedDialog:promptStep');
    try {
      return await stepContext.beginDialog(OAUTH_PROMPT_DIALOG);
    } catch (err) {
      console.error('promptStep:err', err);
    }
  }

  private async loginStep(stepContext: WaterfallStepContext) {
    console.log('AuthorizedDialog:loginStep');
    const tokenResponse = stepContext.result;
    console.log('AuthorizedDialog:loginStep:tokenResponse', tokenResponse);

    if (!tokenResponse || !tokenResponse.token) {
      await stepContext.context.sendActivity(
        'Login was not successful please try again.',
      );

      await stepContext.context.sendActivity({
        attachments: [consentTemplate()],
      });
    } else {
      await stepContext.context.sendActivity(
        'AuthorizedDialog:loginStep:tokenResponse========== ' +
          JSON.stringify(tokenResponse),
      );

      // TODO: check heimdall token
      try {
        // get Heimdall token
        const tokenService = new TokenService();
        const heimdallToken = await tokenService.fetchHeimdallAccessToken(
          stepContext.context,
          tokenResponse.token as string,
        );

        console.log('AuthorizedDialog:loginStep:heimdallToken', heimdallToken);
      } catch (e) {
        console.log('AuthorizedDialog:loginStep:heimdallToken:error', e);

        if (e instanceof SigninError) {
          await stepContext.context.sendActivity({
            attachments: [signinTemplate as any],
          });
        } else {
          throw e;
        }
      }
    }

    return await stepContext.endDialog();
  }

  // private async ensureOAuth(stepContext: WaterfallStepContext) {
  //   console.log('AuthorizedDialog:ensureOAuth');
  //   await stepContext.context.sendActivity('Thank you.');

  //   const result = stepContext.result;
  //   console.log('AuthorizedDialog:ensureOAuth:result', result);
  //   if (result) {
  //     return await stepContext.beginDialog(OAUTH_PROMPT_DIALOG);
  //   }

  //   // return await stepContext.endDialog();
  // }

  // // TODO: Remove later
  // private async displayToken(stepContext: WaterfallStepContext) {
  //   console.log('AuthorizedDialog:displayToken');
  //   const tokenResponse = stepContext.result;
  //   if (!tokenResponse || !tokenResponse.token) {
  //     await stepContext.context.sendActivity(
  //       'Login was not successful please try again.',
  //     );
  //   } else {
  //     // this line shows ever time that user enter a message.
  //     // await stepContext.context.sendActivity('Login successful.');
  //     console.log('loginStep: Login successful');
  //     console.log('Here is the token: ' + tokenResponse?.token);
  //   }

  //   return await stepContext.endDialog();
  // }

  public async run(context: TurnContext, accessor: StatePropertyAccessor) {
    console.log('AuthorizedDialog:run');

    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    const results = await dialogContext.continueDialog();
    console.log('AuthorizedDialog:run:beginDialog:results', results);

    if (results && results.status === DialogTurnStatus.empty) {
      console.log('AuthorizedDialog:run:beginDialog:this.id', this.id);
      await dialogContext.beginDialog(this.id);
    }
  }
}
