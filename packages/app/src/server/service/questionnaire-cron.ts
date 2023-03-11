import axiosRetry from 'axios-retry';

import { StatusType } from '~/interfaces/questionnaire/questionnaire-answer-status';
import { IQuestionnaireOrder } from '~/interfaces/questionnaire/questionnaire-order';
import loggerFactory from '~/utils/logger';
import { getRandomIntInRange } from '~/utils/rand';
import { sleep } from '~/utils/sleep';

import ProactiveQuestionnaireAnswer from '../models/questionnaire/proactive-questionnaire-answer';
import QuestionnaireAnswer from '../models/questionnaire/questionnaire-answer';
import QuestionnaireAnswerStatus from '../models/questionnaire/questionnaire-answer-status';
import QuestionnaireOrder from '../models/questionnaire/questionnaire-order';

const logger = loggerFactory('growi:service:questionnaire-cron');

const axios = require('axios').default;
const nodeCron = require('node-cron');

axiosRetry(axios, { retries: 3 });

/**
 * manage cronjob which
 *  1. fetches QuestionnaireOrders from questionnaire server
 *  2. updates QuestionnaireOrder collection to contain only the ones that exist in the fetched list and is not finished (doesn't have to be started)
 *  3. changes QuestionnaireAnswerStatuses which are 'skipped' to 'not_answered'
 */
class QuestionnaireCronService {

  crowi: any;

  cronJob: any;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(crowi) {
    this.crowi = crowi;
  }

  startCron(): void {
    const cronSchedule = this.crowi.configManager?.getConfig('crowi', 'app:questionnaireCronSchedule');
    const maxHoursUntilRequest = this.crowi.configManager?.getConfig('crowi', 'app:questionnaireCronMaxHoursUntilRequest');

    const maxSecondsUntilRequest = maxHoursUntilRequest * 60 * 60;

    this.cronJob?.stop();
    this.cronJob = this.generateCronJob(cronSchedule, maxSecondsUntilRequest);
    this.cronJob.start();
  }

  stopCron(): void {
    this.cronJob.stop();
  }

  async executeJob(): Promise<void> {
    const growiQuestionnaireServerOrigin = this.crowi.configManager?.getConfig('crowi', 'app:growiQuestionnaireServerOrigin');

    const fetchQuestionnaireOrders = async(): Promise<IQuestionnaireOrder[]> => {
      const response = await axios.get(`${growiQuestionnaireServerOrigin}/questionnaire-order/index`);
      return response.data.questionnaireOrders;
    };

    const saveUnfinishedOrders = async(questionnaireOrders: IQuestionnaireOrder[]) => {
      const currentDate = new Date(Date.now());
      const unfinishedOrders = questionnaireOrders.filter(order => new Date(order.showUntil) > currentDate);
      await QuestionnaireOrder.insertMany(unfinishedOrders);
    };

    const changeSkippedAnswerStatusToNotAnswered = async() => {
      await QuestionnaireAnswerStatus.updateMany(
        { status: StatusType.skipped },
        { status: StatusType.not_answered },
      );
    };

    const resendQuestionnaireAnswers = async() => {
      const questionnaireAnswers = await QuestionnaireAnswer.find();
      const proactiveQuestionnaireAnswers = await ProactiveQuestionnaireAnswer.find();
      axios.post(`${growiQuestionnaireServerOrigin}/questionnaire-answer/batch`, { questionnaireAnswers })
        .then(() => {
          QuestionnaireAnswer.deleteMany();
        });
      axios.post(`${growiQuestionnaireServerOrigin}/questionnaire-answer/proactive/batch`, { proactiveQuestionnaireAnswers })
        .then(() => {
          ProactiveQuestionnaireAnswer.deleteMany();
        });
    };

    const questionnaireOrders: IQuestionnaireOrder[] = await fetchQuestionnaireOrders();

    resendQuestionnaireAnswers();

    // reset QuestionnaireOrder collection and save unfinished ones that exist on questionnaire server
    await QuestionnaireOrder.deleteMany();
    await saveUnfinishedOrders(questionnaireOrders);

    await changeSkippedAnswerStatusToNotAnswered();
  }

  private generateCronJob(cronSchedule: string, maxSecondsUntilRequest: number) {
    return nodeCron.schedule(cronSchedule, async() => {
      // sleep for a random amount to scatter request time from GROWI apps to questionnaire server
      const secToSleep = getRandomIntInRange(0, maxSecondsUntilRequest);
      await sleep(secToSleep * 1000);

      try {
        this.executeJob();
      }
      catch (e) {
        logger.error(e);
      }

    });
  }

}

export default QuestionnaireCronService;
