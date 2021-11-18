import React from 'react';
import PropTypes from 'prop-types';

import { UncontrolledTooltip, Popover, PopoverBody } from 'reactstrap';
import { withTranslation } from 'react-i18next';
import UserPictureList from './User/UserPictureList';
import { withUnstatedContainers } from './UnstatedUtils';

import AppContainer from '~/client/services/AppContainer';

// TODO : user image not displayed in search page. Fix it.
// task : https://estoc.weseek.co.jp/redmine/issues/81110
class LikeButtons extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };

    this.togglePopover = this.togglePopover.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  togglePopover() {
    this.setState(prevState => ({
      ...prevState,
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }


  handleClick() {
    if (this.props.onLikeClicked == null) {
      return;
    }
    this.props.onLikeClicked();
  }

  render() {
    const {
      appContainer, likerIds, sumOfLikers, isLiked, t,
    } = this.props;
    const { isGuestUser } = appContainer;

    return (
      <div className="btn-group" role="group" aria-label="Like buttons">
        <button
          type="button"
          id="like-button"
          onClick={this.handleClick}
          className={`btn btn-like border-0
            ${isLiked ? 'active' : ''} ${isGuestUser ? 'disabled' : ''}`}
        >
          <i className="icon-like"></i>
        </button>
        {isGuestUser && (
          <UncontrolledTooltip placement="top" target="like-button" fade={false}>
            {t('Not available for guest')}
          </UncontrolledTooltip>
        )}

        <button type="button" id="po-total-likes" className={`btn btn-like border-0 total-likes ${isLiked ? 'active' : ''}`}>
          {sumOfLikers}
        </button>
        <Popover placement="bottom" isOpen={this.state.isPopoverOpen} target="po-total-likes" toggle={this.togglePopover} trigger="legacy">
          <PopoverBody className="seen-user-popover">
            <div className="px-2 text-right user-list-content text-truncate text-muted">
              {likerIds.length ? <UserPictureList users={likerIds} /> : t('No users have liked this yet.')}
            </div>
          </PopoverBody>
        </Popover>
      </div>
    );
  }

}

/**
 * Wrapper component for using unstated
 */
const LikeButtonsWrapper = withUnstatedContainers(LikeButtons, [AppContainer]);

LikeButtons.propTypes = {
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  onChangeInvoked: PropTypes.func,
  pageId: PropTypes.string.isRequired,
  likerIds: PropTypes.arrayOf(PropTypes.object).isRequired,
  sumOfLikers: PropTypes.number.isRequired,
  isLiked: PropTypes.bool.isRequired,
  onLikeClicked: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(LikeButtonsWrapper);
