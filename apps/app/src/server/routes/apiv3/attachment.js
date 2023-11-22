import { ErrorV3 } from '@growi/core/dist/models';

import { SupportedAction } from '~/interfaces/activity';
import { AttachmentType } from '~/server/interfaces/attachment';
import { Attachment } from '~/server/models';
import loggerFactory from '~/utils/logger';

import { apiV3FormValidator } from '../../middlewares/apiv3-form-validator';
import { certifySharedPageAttachmentMiddleware } from '../../middlewares/certify-shared-page-attachment';

const logger = loggerFactory('growi:routes:apiv3:attachment'); // eslint-disable-line no-unused-vars
const express = require('express');

const router = express.Router();
const { query, param } = require('express-validator');

const { serializePageSecurely } = require('../../models/serializers/page-serializer');
const { serializeRevisionSecurely } = require('../../models/serializers/revision-serializer');
const { serializeUserSecurely } = require('../../models/serializers/user-serializer');

/**
 * @swagger
 *  tags:
 *    name: Attachment
 */

module.exports = (crowi) => {
  const accessTokenParser = require('../../middlewares/access-token-parser')(crowi);
  const loginRequired = require('../../middlewares/login-required')(crowi, true);
  const Page = crowi.model('Page');
  const User = crowi.model('User');
  const { attachmentService } = crowi;

  const activityEvent = crowi.event('activity');

  const validator = {
    retrieveAttachment: [
      param('id').isMongoId().withMessage('attachment id is required'),
    ],
    retrieveAttachments: [
      query('pageId').isMongoId().withMessage('pageId is required'),
      query('pageNumber').optional().isInt().withMessage('pageNumber must be a number'),
      query('limit').optional().isInt({ max: 100 }).withMessage('You should set less than 100 or not to set limit.'),
    ],
  };

  /**
   * @swagger
   *
   *    /attachment/list:
   *      get:
   *        tags: [Attachment]
   *        description: Get attachment list
   *        responses:
   *          200:
   *            description: Return attachment list
   *        parameters:
   *          - name: page_id
   *            in: query
   *            required: true
   *            description: page id
   *            schema:
   *              type: string
   */
  router.get('/list', accessTokenParser, loginRequired, validator.retrieveAttachments, apiV3FormValidator, async(req, res) => {

    const limit = req.query.limit || await crowi.configManager.getConfig('crowi', 'customize:showPageLimitationS') || 10;
    const pageNumber = req.query.pageNumber || 1;
    const offset = (pageNumber - 1) * limit;

    try {
      const pageId = req.query.pageId;
      // check whether accessible
      const isAccessible = await Page.isAccessiblePageByViewer(pageId, req.user);
      if (!isAccessible) {
        const msg = 'Current user is not accessible to this page.';
        return res.apiv3Err(new ErrorV3(msg, 'attachment-list-failed'), 403);
      }

      // directly get paging-size from db. not to delivery from client side.

      const paginateResult = await Attachment.paginate(
        { page: pageId },
        {
          limit,
          offset,
          populate: 'creator',
        },
      );

      paginateResult.docs.forEach((doc) => {
        if (doc.creator != null && doc.creator instanceof User) {
          doc.creator = serializeUserSecurely(doc.creator);
        }
      });

      return res.apiv3({ paginateResult });
    }
    catch (err) {
      logger.error('Attachment not found', err);
      return res.apiv3Err(err, 500);
    }
  });

  /**
   * @swagger
   *
   *    /attachment/{id}:
   *      get:
   *        tags: [Attachment]
   *        description: Get attachment
   *        responses:
   *          200:
   *            description: Return attachment
   *        parameters:
   *          - name: id
   *            in: path
   *            required: true
   *            description: attachment id
   *            schema:
   *              type: string
   */
  router.get('/:id', accessTokenParser, certifySharedPageAttachmentMiddleware, loginRequired, validator.retrieveAttachment, apiV3FormValidator,
    async(req, res) => {
      try {
        const attachmentId = req.params.id;

        const attachment = await Attachment.findById(attachmentId).populate('creator').exec();

        if (attachment == null) {
          const message = 'Attachment not found';
          return res.apiv3Err(message, 404);
        }

        if (attachment.creator != null && attachment.creator instanceof User) {
          attachment.creator = serializeUserSecurely(attachment.creator);
        }

        return res.apiv3({ attachment });
      }
      catch (err) {
        logger.error('Attachment retrieval failed', err);
        return res.apiv3Err(err, 500);
      }
    });

  /**
   * @swagger
   *
   *    /attachment/limit:
   *      get:
   *        tags: [Attachment]
   *        operationId: getAttachmentLimit
   *        summary: /attachment/limit
   *        description: Get available capacity of uploaded file with GridFS
   *        parameters:
   *          - in: query
   *            name: fileSize
   *            schema:
   *              type: number
   *              description: file size
   *              example: 23175
   *            required: true
   *        responses:
   *          200:
   *            description: Succeeded to get available capacity of uploaded file with GridFS.
   *            content:
   *              application/json:
   *                schema:
   *                  properties:
   *                    isUploadable:
   *                      type: boolean
   *                      description: uploadable
   *                      example: true
   *          403:
   *            $ref: '#/components/responses/403'
   *          500:
   *            $ref: '#/components/responses/500'
   */
  /**
   * @api {get} /attachment/limit get available capacity of uploaded file with GridFS
   * @apiName AddAttachment
   * @apiGroup Attachment
   */
  router.get('/limit', accessTokenParser, loginRequired, apiV3FormValidator, async(req, res) => {
    const { fileUploadService } = crowi;
    const fileSize = Number(req.query.fileSize);
    return res.apiv3(await fileUploadService.checkLimit(fileSize));
  });


  /**
   * @swagger
   *
   *    /attachment/add:
   *      post:
   *        tags: [Attachment, CrowiCompatibles]
   *        operationId: addAttachment
   *        summary: /attachment/add
   *        description: Add attachment to the page
   *        requestBody:
   *          content:
   *            "multipart/form-data":
   *              schema:
   *                properties:
   *                  page_id:
   *                    nullable: true
   *                    type: string
   *                  path:
   *                    nullable: true
   *                    type: string
   *                  file:
   *                    type: string
   *                    format: binary
   *                    description: attachment data
   *              encoding:
   *                path:
   *                  contentType: application/x-www-form-urlencoded
   *            "*\/*":
   *              schema:
   *                properties:
   *                  page_id:
   *                    nullable: true
   *                    type: string
   *                  path:
   *                    nullable: true
   *                    type: string
   *                  file:
   *                    type: string
   *                    format: binary
   *                    description: attachment data
   *              encoding:
   *                path:
   *                  contentType: application/x-www-form-urlencoded
   *        responses:
   *          200:
   *            description: Succeeded to add attachment.
   *            content:
   *              application/json:
   *                schema:
   *                  properties:
   *                    page:
   *                      $ref: '#/components/schemas/Page'
   *                    attachment:
   *                      $ref: '#/components/schemas/Attachment'
   *                    url:
   *                      $ref: '#/components/schemas/Attachment/properties/url'
   *                    pageCreated:
   *                      type: boolean
   *                      description: whether the page was created
   *                      example: false
   *          403:
   *            $ref: '#/components/responses/403'
   *          500:
   *            $ref: '#/components/responses/500'
   */
  /**
   * @api {post} /attachment/add Add attachment to the page
   * @apiName AddAttachment
   * @apiGroup Attachment
   *
   * @apiParam {String} page_id
   * @apiParam {File} file
   */
  router.post('/add', accessTokenParser, loginRequired, apiV3FormValidator, async(req, res) => {
    const pageId = req.body.page_id || null;
    const pagePath = req.body.path || null;

    // check params
    if (pageId == null && pagePath == null) {
      return res.apiv3Err('Either page_id or path is required.');
    }
    if (req.file == null) {
      return res.apiv3Err('File error.');
    }

    const file = req.file;

    try {
      const page = await Page.findById(pageId);

      // check the user is accessible
      const isAccessible = await Page.isAccessiblePageByViewer(page.id, req.user);
      if (!isAccessible) {
        return res.apiv3Err(`Forbidden to access to the page '${page.id}'`);
      }

      const attachment = await attachmentService.createAttachment(file, req.user, pageId, AttachmentType.WIKI_PAGE);

      const result = {
        page: serializePageSecurely(page),
        revision: serializeRevisionSecurely(page.revision),
        attachment: attachment.toObject({ virtuals: true }),
      };

      activityEvent.emit('update', res.locals.activity._id, { action: SupportedAction.ACTION_ATTACHMENT_ADD });

      res.apiv3(result);
    }
    catch (err) {
      logger.error(err);
      return res.apiv3Err(err.message);
    }
  });


  return router;
};
