import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';

import { configManager } from '~/server/service/config-manager';
import { S2sMessagingService } from '~/server/service/s2s-messaging/base';
import loggerFactory from '~/utils/logger';

import { ExternalGroupProviderType, ExternalUserGroupTreeNode, ExternalUserInfo } from '../../interfaces/external-user-group';

import ExternalUserGroupSyncService from './external-user-group-sync';

const logger = loggerFactory('growi:service:keycloak-user-group-sync-service');

export class KeycloakUserGroupSyncService extends ExternalUserGroupSyncService {

  kcAdminClient: KeycloakAdminClient;

  realm: string; // realm that contains the groups

  groupDescriptionAttribute: string; // attribute to map to group description

  isInitialized = false;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(s2sMessagingService: S2sMessagingService | null, socketIoService) {
    const kcHost = configManager?.getConfig('crowi', 'external-user-group:keycloak:host');
    const kcGroupRealm = configManager?.getConfig('crowi', 'external-user-group:keycloak:groupRealm');
    const kcGroupSyncClientRealm = configManager?.getConfig('crowi', 'external-user-group:keycloak:groupSyncClientRealm');
    const kcGroupDescriptionAttribute = configManager?.getConfig('crowi', 'external-user-group:keycloak:groupDescriptionAttribute');

    super(ExternalGroupProviderType.keycloak, s2sMessagingService, socketIoService);
    this.kcAdminClient = new KeycloakAdminClient({ baseUrl: kcHost, realmName: kcGroupSyncClientRealm });
    this.realm = kcGroupRealm;
    this.groupDescriptionAttribute = kcGroupDescriptionAttribute;
  }

  init(authProviderType: 'oidc' | 'saml'): void {
    this.authProviderType = authProviderType;
    this.isInitialized = true;
  }

  override syncExternalUserGroups(): Promise<void> {
    if (!this.isInitialized) {
      const msg = 'Service not initialized';
      logger.error(msg);
      throw new Error(msg);
    }
    return super.syncExternalUserGroups();
  }

  override async generateExternalUserGroupTrees(): Promise<ExternalUserGroupTreeNode[]> {
    await this.auth();

    // Type is 'GroupRepresentation', but 'find' does not return 'attributes' field. Hence, attribute for description is not present.
    logger.info('Get groups from keycloak server');
    const rootGroups = await await this.kcAdminClient.groups.find({ realm: this.realm });

    const treesWithNull: (ExternalUserGroupTreeNode | null)[] = [];
    // Do not use Promise.all, because the keycloak server may not be able to handle all requests
    for await (const group of rootGroups) {
      treesWithNull.push(await this.groupRepresentationToTreeNode(group));
    }
    return treesWithNull
      .filter((node): node is NonNullable<ExternalUserGroupTreeNode> => node != null);
  }

  /**
   * Authenticate to group sync client using client credentials grant type
   */
  private async auth(): Promise<void> {
    const kcGroupSyncClientID: string = configManager.getConfig('crowi', 'external-user-group:keycloak:groupSyncClientID');
    const kcGroupSyncClientSecret: string = configManager.getConfig('crowi', 'external-user-group:keycloak:groupSyncClientSecret');

    await this.kcAdminClient.auth({
      grantType: 'client_credentials',
      clientId: kcGroupSyncClientID,
      clientSecret: kcGroupSyncClientSecret,
    });
  }

  /**
   * Convert GroupRepresentation response returned from Keycloak to ExternalUserGroupTreeNode
   */
  private async groupRepresentationToTreeNode(group: GroupRepresentation): Promise<ExternalUserGroupTreeNode | null> {
    if (group.id == null || group.name == null) return null;

    logger.info('Get users from keycloak server');
    const userRepresentations = await this.getMembers(group.id);

    const userInfos = userRepresentations != null ? this.userRepresentationsToExternalUserInfos(userRepresentations) : [];
    const description = await this.getGroupDescription(group.id) || undefined;
    const childGroups = group.subGroups;

    const childGroupNodesWithNull: (ExternalUserGroupTreeNode | null)[] = [];
    if (childGroups != null) {
      // Do not use Promise.all, because the number of promises processed can
      // exponentially grow when group tree is enormous
      for await (const childGroup of childGroups) {
        childGroupNodesWithNull.push(await this.groupRepresentationToTreeNode(childGroup));
      }
    }
    const childGroupNodes: ExternalUserGroupTreeNode[] = childGroupNodesWithNull
      .filter((node): node is NonNullable<ExternalUserGroupTreeNode> => node != null);

    return {
      id: group.id,
      userInfos,
      childGroupNodes,
      name: group.name,
      description,
    };
  }

  private async getMembers(groupId: string): Promise<UserRepresentation[]> {
    let allUsers: UserRepresentation[] = [];

    const fetchUsersWithOffset = async(offset: number) => {
      await this.auth();
      const response = await this.kcAdminClient.groups.listMembers({
        id: groupId, realm: this.realm, first: offset,
      });

      if (response != null && response.length > 0) {
        allUsers = allUsers.concat(response);
        return fetchUsersWithOffset(offset + response.length);
      }
    };

    await fetchUsersWithOffset(0);

    return allUsers;
  }


  /**
   * Fetch group detail from Keycloak and return group description
   */
  private async getGroupDescription(groupId: string): Promise<string | null> {
    if (this.groupDescriptionAttribute == null) return null;

    await this.auth();
    const groupDetail = await this.kcAdminClient.groups.findOne({ id: groupId, realm: this.realm });

    const description = groupDetail?.attributes?.[this.groupDescriptionAttribute]?.[0];
    return typeof description === 'string' ? description : null;
  }

  /**
   * Convert UserRepresentation array response returned from Keycloak to ExternalUserInfo
   */
  private userRepresentationsToExternalUserInfos(userRepresentations: UserRepresentation[]): ExternalUserInfo[] {
    const externalUserGroupsWithNull: (ExternalUserInfo | null)[] = userRepresentations.map((userRepresentation) => {
      if (userRepresentation.id != null && userRepresentation.username != null) {
        return {
          id: userRepresentation.id,
          username: userRepresentation.username,
          email: userRepresentation.email,
        };
      }
      return null;
    });

    return externalUserGroupsWithNull.filter((node): node is NonNullable<ExternalUserInfo> => node != null);
  }

}
