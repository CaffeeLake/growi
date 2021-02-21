const logger = require('@alias/logger')('growi:service:BoltService');

class BoltReciever {

  init(app) {
    this.bolt = app;
  }

  async requestHandler(req, res) {
    let ackCalled = false;

    // for verification request URL on Event Subscriptions
    if (req.body.challenge && req.body.type) {
      return res.send(req.body);
    }

    const payload = req.body.payload;
    let reqBody;

    if (payload != null) {
      reqBody = JSON.parse(payload);
    }
    else {
      reqBody = req.body;
    }

    const event = {
      body: reqBody,
      ack: (response) => {
        if (ackCalled) {
          return;
        }

        if (response instanceof Error) {
          res.status(500).send();
        }
        else if (!response) {
          res.send('');
        }
        else {
          res.send(response);
        }

        ackCalled = true;
      },
    };

    console.log(event);
    await this.bolt.processEvent(event);
  }

}

const { App } = require('@slack/bolt');
const { WebClient, LogLevel } = require('@slack/web-api');

class BoltService {

  constructor(crowi) {
    this.crowi = crowi;
    this.receiver = new BoltReciever();

    const signingSecret = crowi.configManager.getConfig('crowi', 'slackbot:signingSecret');
    const token = crowi.configManager.getConfig('crowi', 'slackbot:token');

    const client = new WebClient(token, { logLevel: LogLevel.DEBUG });
    this.client = client;

    if (token != null || signingSecret != null) {
      logger.debug('TwitterStrategy: setup is done');
      this.bolt = new App({
        token,
        signingSecret,
        receiver: this.receiver,
      });
      this.init();
    }
  }

  init() {
    // Example of listening for event
    // See. https://github.com/slackapi/bolt-js#listening-for-events
    // or https://slack.dev/bolt-js/concepts#basic
    this.bolt.command('/growi-bot', async({ command, ack, say }) => { // demo
      await say('Hello');
    });

    // The echo command simply echoes on command
    this.bolt.command('/echo', async({ command, ack, say }) => {
      // Acknowledge command request
      await ack();

      await say(`${command.text}`);
    });

    this.bolt.command('/growi', async({
      command, client, body, ack,
    }) => {
      await ack();
      const args = command.text.split(' ');
      const firstArg = args[0];

      switch (firstArg) {
        case 'search':
          this.searchResults(command, args);
          break;

        case 'create':
          this.createModal(command, client, body);
          break;

        default:
          this.notCommand(command);
          break;
      }
    });

    this.bolt.view('createPage', async({ ack, view }) => {
      await ack();
      return this.createPageInGrowi(view);
    });

    this.bolt.action('button_click', async({
      body, ack, say, action,
    }) => {
      await ack();
      await say(action.value);
    });

  }

  notCommand(command) {
    logger.error('Input first arguments');
    return this.client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      blocks: [
        this.generateMarkdownSectionBlock('*No command.*\n Hint\n `/growi [command] [keyword]`'),
      ],
    });

  }

  async getSearchResultPaths(command, args) {
    const firstKeyword = args[1];
    if (firstKeyword == null) {
      return this.client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks: [
          this.generateMarkdownSectionBlock('*Input keywords.*\n Hint\n `/growi search [keyword]`'),
        ],
      });
    }

    // remove leading 'search'.
    args.shift();
    const keywords = args.join(' ');
    const { searchService } = this.crowi;
    const option = { limit: 10 };
    const results = await searchService.searchKeyword(keywords, null, {}, option);

    // no search results
    if (results.data.length === 0) {
      return this.client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks: [
          this.generateMarkdownSectionBlock('*No page that match your keywords.*'),
        ],
      });
    }

    const resultPaths = results.data.map((data) => {
      return data._source.path;
    });

    return resultPaths;
  }

  async searchResults(command, args) {
    const resultPaths = await this.getSearchResultPaths(command, args);

    try {
      await this.client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks: [
          this.generateMarkdownSectionBlock('10 results.'),
          this.generateMarkdownSectionBlock(`${resultPaths.join('\n')}`),
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Share the results.',
                },
                style: 'primary',
                action_id: 'button_click',
                value: `${resultPaths.join('\n')}`,
              },
            ],
          },
        ],
      });
    }
    catch {
      logger.error('Failed to get search results.');
      await this.client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks: [
          this.generateMarkdownSectionBlock('*Failed to search.*\n Hint\n `/growi search [keyword]`'),
        ],
      });
    }
  }

  async createModal(command, client, body) {
    const User = this.crowi.model('User');

    try {
      const slackUser = await User.findUserByUsername('slackUser');

      // if "slackUser" is null, don't show create Modal
      if (slackUser == null) {
        throw new Error('userNull');
      }

      await client.views.open({
        trigger_id: body.trigger_id,

        view: {
          type: 'modal',
          callback_id: 'createPage',
          title: {
            type: 'plain_text',
            text: 'Create Page',
          },
          submit: {
            type: 'plain_text',
            text: 'Submit',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            this.generateMarkdownSectionBlock('Create new page.'),
            this.generateInputSectionBlock('path', 'Path', 'path_input', false, '/path'),
            this.generateInputSectionBlock('contents', 'Contents', 'contents_input', true, 'Input with Markdown...'),
          ],
        },
      });
    }
    catch (e) {
      if (e instanceof Error) {
        return this.client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          blocks: [
            this.generateMarkdownSectionBlock('*slackUser does not exist.*'),
          ],
        });
      }

      logger.error('Failed to create page.');
      await this.client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks: [
          this.generateMarkdownSectionBlock('*Failed to create new page.*\n Hint\n `/growi create`'),
        ],
      });
    }
  }

  // Submit action in create Modal
  async createPageInGrowi(view) {
    const User = this.crowi.model('User');
    const Page = this.crowi.model('Page');
    const pathUtils = require('growi-commons').pathUtils;

    try {
      // search "slackUser" to create page in slack
      const slackUser = await User.findUserByUsername('slackUser');

      let path = view.state.values.path.path_input.value;
      const body = view.state.values.contents.contents_input.value;

      // sanitize path
      path = this.crowi.xss.process(path);
      path = pathUtils.normalizePath(path);

      const user = slackUser._id;
      return Page.create(path, body, user, {});
    }
    catch {
      logger.error('Failed to create page in GROWI.');
    }
  }

  generateMarkdownSectionBlock(blocks) {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: blocks,
      },
    };
  }

  generateInputSectionBlock(blockId, labelText, actionId, isMultiline, placeholder) {
    return {
      type: 'input',
      block_id: blockId,
      label: {
        type: 'plain_text',
        text: labelText,
      },
      element: {
        type: 'plain_text_input',
        action_id: actionId,
        multiline: isMultiline,
        placeholder: {
          type: 'plain_text',
          text: placeholder,
        },
      },
    };
  }

}

module.exports = BoltService;
