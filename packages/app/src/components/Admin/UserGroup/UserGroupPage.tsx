import React, {
  FC, Fragment, useState, useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import UserGroupTable from './UserGroupTable';
import UserGroupModal from './UserGroupModal';
import UserGroupDeleteModal from './UserGroupDeleteModal';

import { withUnstatedContainers } from '../../UnstatedUtils';
import AppContainer from '~/client/services/AppContainer';
import { toastSuccess, toastError } from '~/client/util/apiNotification';
import { IUserGroup, IUserGroupHasId } from '~/interfaces/user';
import Xss from '~/services/xss';
import { CustomWindow } from '~/interfaces/global';
import { apiv3Delete, apiv3Post } from '~/client/util/apiv3-client';
import { useSWRxUserGroupList, useSWRxChildUserGroupList, useSWRxUserGroupRelationList } from '~/stores/user-group';
import { useIsAclEnabled } from '~/stores/context';

type Props = {
  appContainer: AppContainer,
};

const UserGroupPage: FC<Props> = (props: Props) => {
  const xss: Xss = (window as CustomWindow).xss;
  const { t } = useTranslation();

  const { data: isAclEnabled } = useIsAclEnabled();

  /*
   * Fetch
   */
  const { data: userGroupList, mutate: mutateUserGroups } = useSWRxUserGroupList();
  const userGroups = userGroupList != null ? userGroupList : [];
  const userGroupIds = userGroups.map(group => group._id);

  const { data: userGroupRelationList } = useSWRxUserGroupRelationList(userGroupIds);
  const userGroupRelations = userGroupRelationList != null ? userGroupRelationList : [];

  const { data: childUserGroupsList } = useSWRxChildUserGroupList(userGroupIds);
  const childUserGroups = childUserGroupsList != null ? childUserGroupsList.childUserGroups : [];

  /*
   * State
   */
  const [selectedUserGroup, setSelectedUserGroup] = useState<IUserGroupHasId | undefined>(undefined); // not null but undefined (to use defaultProps in UserGroupDeleteModal)
  const [isCreateModalShown, setCreateModalShown] = useState<boolean>(false);
  const [isDeleteModalShown, setDeleteModalShown] = useState<boolean>(false);

  /*
   * Functions
   */
  const showCreateModal = useCallback(() => {
    setCreateModalShown(true);
  }, [setCreateModalShown]);

  const syncUserGroupAndRelations = useCallback(async() => {
    try {
      await mutateUserGroups();
    }
    catch (err) {
      toastError(err);
    }
  }, [mutateUserGroups]);

  const showDeleteModal = useCallback(async(group: IUserGroupHasId) => {
    try {
      await syncUserGroupAndRelations();

      setSelectedUserGroup(group);
      setDeleteModalShown(true);
    }
    catch (err) {
      toastError(err);
    }
  }, [syncUserGroupAndRelations]);

  const hideDeleteModal = useCallback(() => {
    setSelectedUserGroup(undefined);
    setDeleteModalShown(false);
  }, []);

  const createUserGroup = useCallback(async(userGroupData: IUserGroup) => {
    try {
      await apiv3Post('/user-groups', {
        name: userGroupData.name,
        description: userGroupData.description,
        parent: userGroupData.parent,
      });
      toastSuccess(t('toaster.update_successed', { target: t('UserGroup') }));
      await mutateUserGroups();
    }
    catch (err) {
      toastError(err);
    }
  }, [t, mutateUserGroups]);

  const deleteUserGroupById = useCallback(async(deleteGroupId: string, actionName: string, transferToUserGroupId: string) => {
    try {
      const res = await apiv3Delete(`/user-groups/${deleteGroupId}`, {
        actionName,
        transferToUserGroupId,
      });

      // sync
      await mutateUserGroups();

      setSelectedUserGroup(undefined);
      setDeleteModalShown(false);

      toastSuccess(`Deleted ${res.data.userGroups.length} groups.`);
    }
    catch (err) {
      toastError(new Error('Unable to delete the groups'));
    }
  }, [mutateUserGroups]);

  return (
    <div data-testid="admin-user-groups">
      {
        isAclEnabled ? (
          <div className="mb-2">
            <button type="button" className="btn btn-outline-secondary" onClick={showCreateModal}>
              {t('admin:user_group_management.create_group')}
            </button>
          </div>
        ) : (
          t('admin:user_group_management.deny_create_group')
        )
      }
      <UserGroupModal
        submitButtonLabel={t('Create')}
        onSubmit={createUserGroup}
        isShow={isCreateModalShown}
      />
      <>
        <UserGroupTable
          headerLabel={t('admin:user_group_management.group_list')}
          userGroups={userGroups}
          childUserGroups={childUserGroups}
          isAclEnabled={isAclEnabled ?? false}
          onDelete={showDeleteModal}
          userGroupRelations={userGroupRelations}
        />
        <UserGroupDeleteModal
          userGroups={userGroups}
          deleteUserGroup={selectedUserGroup}
          onDelete={deleteUserGroupById}
          isShow={isDeleteModalShown}
          onShow={showDeleteModal}
          onHide={hideDeleteModal}
        />
      </>
    </div>
  );
};

/**
 * Wrapper component for using unstated
 */
const UserGroupPageWrapper = withUnstatedContainers(UserGroupPage, [AppContainer]);

export default UserGroupPageWrapper;
