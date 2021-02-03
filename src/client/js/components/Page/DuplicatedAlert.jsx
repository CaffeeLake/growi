import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';


const DuplicatedAlert = (props) => {
  const { t } = props;

  return (
    <div className="alert alert-success py-3 px-4">
      <strong>
        { t('Duplicated') }:{t('page_page.notice.duplicated')}
      </strong>
    </div>
  );
};

DuplicatedAlert.propTypes = {
  t: PropTypes.func.isRequired, // i18next
};

export default withTranslation()(DuplicatedAlert);
