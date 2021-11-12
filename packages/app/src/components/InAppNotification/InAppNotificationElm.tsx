import React, { useCallback } from 'react';

import { UserPicture, PagePathLabel } from '@growi/ui';
import { IInAppNotification } from '~/interfaces/in-app-notification';
import { apiv3Post } from '~/client/util/apiv3-client';
import FormattedDistanceDate from '../FormattedDistanceDate';

import loggerFactory from '~/utils/logger';

const logger = loggerFactory('growi:InAppNotificationElm');


interface Props {
  notification: IInAppNotification
}

const InAppNotificationElm = (props: Props): JSX.Element => {

  const { notification } = props;


  const getActionUsers = () => {
    const latestActionUsers = notification.actionUsers.slice(0, 3);
    const latestUsers = latestActionUsers.map((user) => {
      return `@${user.name}`;
    });

    let actionedUsers = '';
    const latestUsersCount = latestUsers.length;
    if (latestUsersCount === 1) {
      actionedUsers = latestUsers[0];
    }
    else if (notification.actionUsers.length >= 4) {
      actionedUsers = `${latestUsers.slice(0, 2).join(', ')} and ${notification.actionUsers.length - 2} others`;
    }
    else {
      actionedUsers = latestUsers.join(', ');
    }

    return actionedUsers;
  };

  const renderActionUserPictures = (): JSX.Element => {
    const actionUsers = notification.actionUsers;

    if (actionUsers.length < 1) {
      return <></>;
    }
    if (actionUsers.length === 1) {
      return <UserPicture user={actionUsers[0]} size="md" noTooltip />;
    }
    return (
      <div className="position-relative">
        <UserPicture user={actionUsers[0]} size="md" noTooltip />
        <div className="position-absolute" style={{ top: 10, left: 10 }}>
          <UserPicture user={actionUsers[1]} size="md" noTooltip />
        </div>

      </div>
    );
  };

  const notificationClickHandler = useCallback(() => {
    // set notification status "OPEND"
    apiv3Post('/in-app-notification/open', { id: notification._id });

    // jump to target page
    window.location.href = notification.target.path;
  }, []);

  const actionUsers = getActionUsers();
  const pagePath = { path: props.notification.target.path };

  const actionType: string = notification.action;
  let actionMsg: string;
  let actionIcon: string;

  switch (actionType) {
    case 'PAGE_UPDATE':
      actionMsg = 'updated on';
      actionIcon = 'ti-agenda';
      break;
    case 'COMMENT_CREATE':
      actionMsg = 'commented on';
      actionIcon = 'icon-bubble';
      break;
    default:
      actionMsg = '';
      actionIcon = '';
  }


  return (
    <div className="dropdown-item d-flex flex-row mb-3">
      <div className="p-2 mr-2 d-flex align-items-center">
        {renderActionUserPictures()}
      </div>
      <div className="p-2">
        <div onClick={notificationClickHandler}>
          <div>
            <b>{actionUsers}</b> {actionMsg} <PagePathLabel page={pagePath} />
          </div>
          <i className={`${actionIcon} mr-2`} />
          <FormattedDistanceDate
            id={notification._id}
            date={notification.createdAt}
            isShowTooltip={false}
            isEnabledShowDate={false}
          />
        </div>
      </div>
    </div>
  );
};

export default InAppNotificationElm;
