import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
} from 'reactstrap';
import { withTranslation } from 'react-i18next';
import geu from './GridEditorUtil';
import BootstrapGrid from '../../models/BootstrapGrid';

const resSizes = BootstrapGrid.ResponsiveSize;
const resSizeObj = {
  [resSizes.XS_SIZE]: { iconClass: 'icon-screen-smartphone', displayText: 'grid_edit.smart_no' },
  [resSizes.SM_SIZE]: { iconClass: 'icon-screen-tablet', displayText: 'tablet' },
  [resSizes.MD_SIZE]: { iconClass: 'icon-screen-desktop', displayText: 'desktop' },
};
class GridEditModal extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      colsRatios: [6, 6],
      responsiveSize: BootstrapGrid.ResponsiveSize.XS_SIZE,
      show: false,
      gridHtml: '',
    };

    this.checkResposiveSize = this.checkResposiveSize.bind(this);
    this.checkColsRatios = this.checkColsRatios.bind(this);
    this.init = this.init.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.cancel = this.cancel.bind(this);
    this.pasteCodedGrid = this.pasteCodedGrid.bind(this);
    this.renderSelectedGridPattern = this.renderSelectedGridPattern.bind(this);
    this.renderSelectedBreakPoint = this.renderSelectedBreakPoint.bind(this);
  }

  async checkResposiveSize(rs) {
    await this.setState({ responsiveSize: rs });
  }

  async checkColsRatios(cr) {
    await this.setState({ colsRatios: cr });
  }

  init(gridHtml) {
    const initGridHtml = gridHtml;
    this.setState({ gridHtml: initGridHtml }, function() {
      // display gridHtml for re-editing
      console.log(this.state.gridHtml);
    });
  }

  show(gridHtml) {
    this.init(gridHtml);
    this.setState({ show: true });
  }

  hide() {
    this.setState({ show: false });
  }

  cancel() {
    this.hide();
  }

  pasteCodedGrid() {
    const { colsRatios, responsiveSize } = this.state;
    const convertedHTML = geu.convertRatiosAndSizeToHTML(colsRatios, responsiveSize);
    const spaceTab = '    ';
    const pastedGridData = `::: editable-row\n<div class="container">\n${spaceTab}<div class="row">\n${convertedHTML}\n${spaceTab}</div>\n</div>\n:::`;
    // display converted html on console
    console.log(convertedHTML);

    if (this.props.onSave != null) {
      this.props.onSave(pastedGridData);
    }
    this.cancel();
  }

  renderSelectedGridPattern() {
    const colsRatios = this.state.colsRatios;
    return colsRatios.join(' - ');
  }

  renderSelectedBreakPoint() {
    const { t } = this.props;
    const output = Object.entries(resSizeObj).map((responsiveSizeForMap) => {
      return (this.state.responsiveSize === responsiveSizeForMap[0]
        && (
        <span>
          <i className={`pr-1 ${responsiveSizeForMap[1].iconClass}`}> {t(responsiveSizeForMap[1].displayText)}</i>
        </span>
        )
      );
    });
    return output;
  }

  renderGridDivisionMenu() {
    const gridDivisions = geu.mappingAllGridDivisionPatterns;
    const { t } = this.props;
    return (
      <div className="container">
        <div className="row">
          {gridDivisions.map((gridDivion, i) => {
            return (
              <div className="col-md-4 text-center">
                <h6 className="dropdown-header">{gridDivion.numberOfGridDivisions} {t('grid_edit.division')}</h6>
                {gridDivion.mapping.map((gridOneDivision) => {
                  return (
                    <button className="dropdown-item" type="button" onClick={() => { this.checkColsRatios(gridOneDivision) }}>
                      <div className="row">
                        {gridOneDivision.map((god) => {
                          const className = `bg-info col-${god} border`;
                          return <span className={className}>{god}</span>;
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  renderBreakPointMenu() {
    const { t } = this.props;
    const output = Object.entries(resSizeObj).map((responsiveSizeForMap) => {
      return (
        <button className="dropdown-item" type="button" onClick={() => { this.checkResposiveSize(responsiveSizeForMap[0]) }}>
          <i className={`${responsiveSizeForMap[1].iconClass}`}></i> {t(responsiveSizeForMap[1].displayText)}
        </button>
      );
    });
    return output;
  }

  renderPreview() {

    // TODO GW-3721 make objects and simplify all loops
    /* const prevSize = BootstrapGrid.ResponsiveSize;
    const prevSizeObj = {
      [prevSize.MD_SIZE]: {
        [prevSize.MD_SIZE]: {
          iconClass: 'icon-screen-desktop', prevClass: 'desktop-preview', prevText: 'Desktop', prevRender: this.renderNoBreakPreview(),
        },
        [prevSize.SM_SIZE]: {
          iconClass: 'icon-screen-tablet', prevClass: 'tablet-preview', prevText: 'Tablet', prevRender: this.renderBreakPreview(),
        },
        [prevSize.XS_SIZE]: {
          iconClass: 'icon-screen-smartphone', prevClass: 'mobile-preview', prevText: 'Smartphone', prevRender: this.renderBreakPreview(),
        },
      },
      [prevSize.SM_SIZE]: {
        [prevSize.MD_SIZE]: {
          iconClass: 'icon-screen-desktop', prevClass: 'desktop-preview', prevText: 'Desktop', prevRender: this.renderNoBreakPreview(),
        },
        [prevSize.SM_SIZE]: {
          iconClass: 'icon-screen-tablet', prevClass: 'tablet-preview', prevText: 'Tablet', prevRender: this.renderNoBreakPreview(),
        },
        [prevSize.XS_SIZE]: {
          iconClass: 'icon-screen-smartphone', prevClass: 'mobile-preview', prevText: 'Smartphone', prevRender: this.renderBreakPreview(),
        },
      },
      [prevSize.MD_SIZE]: {
        [prevSize.MD_SIZE]: {
          iconClass: 'icon-screen-desktop', prevClass: 'desktop-preview', prevText: 'Desktop', prevRender: this.renderNoBreakPreview(),
        },
        [prevSize.SM_SIZE]: {
          iconClass: 'icon-screen-tablet', prevClass: 'tablet-preview', prevText: 'Tablet', prevRender: this.renderNoBreakPreview(),
        },
        [prevSize.XS_SIZE]: {
          iconClass: 'icon-screen-smartphone', prevClass: 'mobile-preview', prevText: 'Smartphone', prevRender: this.renderNoBreakPreview(),
        },
      },
    }; */
    const { t } = this.props;
    if (this.state.responsiveSize === BootstrapGrid.ResponsiveSize.MD_SIZE) {
      return (
        <>
          <div className="col-lg-6">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-desktop"></i>{t('desktop')}</label>
            <div className="desktop-preview d-block">
              {this.renderNoBreakPreview()}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-tablet"></i>{t('tablet')}</label>
            <div className="tablet-preview d-block">
              {this.renderBreakPreview()}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-smartphone"></i>{t('phone')}</label>
            <div className="mobile-preview d-block">
              {this.renderBreakPreview()}
            </div>
          </div>
        </>
      );
    }
    if (this.state.responsiveSize === BootstrapGrid.ResponsiveSize.SM_SIZE) {
      return (
        <>
          <div className="col-lg-6">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-desktop"></i>{t('desktop')}</label>
            <div className="desktop-preview d-block">
              {this.renderNoBreakPreview()}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-tablet"></i>{t('tablet')}</label>
            <div className="tablet-preview d-block">
              {this.renderNoBreakPreview()}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-smartphone"></i>{t('phone')}</label>
            <div className="mobile-preview d-block">
              {this.renderBreakPreview()}
            </div>
          </div>
        </>
      );
    }
    if (this.state.responsiveSize === BootstrapGrid.ResponsiveSize.XS_SIZE) {
      return (
        <>
          <div className="col-lg-6">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-desktop"></i>{t('desktop')}</label>
            <div className="desktop-preview d-block">
              {this.renderNoBreakPreview()}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-tablet"></i>{t('tablet')}</label>
            <div className="tablet-preview d-block">
              {this.renderNoBreakPreview()}
            </div>
          </div>
          <div className="col-lg-3">
            <label className="d-block mt-2"><i className="pr-2 icon-screen-smartphone"></i>{t('phone')}</label>
            <div className="mobile-preview d-block">
              {this.renderNoBreakPreview()}
            </div>
          </div>
        </>
      );
    }
  }

  renderNoBreakPreview() {
    const { colsRatios } = this.state;
    const convertedHTML = colsRatios.map((colsRatios) => {
      const className = `col-${colsRatios} border`;
      return (
        <div className={className}></div>
      );
    });
    return (
      <div className="row">{convertedHTML}</div>
    );
  }

  renderBreakPreview() {
    const { colsRatios } = this.state;
    const convertedHTML = colsRatios.map(() => {
      const className = 'col-12 border';
      return (
        <div className={className}></div>
      );
    });
    return (
      <div className="row">{convertedHTML}</div>
    );
  }

  render() {
    const { t } = this.props;
    return (
      <Modal isOpen={this.state.show} toggle={this.cancel} size="xl" className="grw-grid-edit-modal">
        <ModalHeader tag="h4" toggle={this.cancel} className="bg-primary text-light">
          {t('grid_edit.create_bootstrap_4_grid')}
        </ModalHeader>
        <ModalBody>
          <div className="container">
            <div className="row">
              <div className="col-lg-6 mb-3">
                <label htmlFor="gridPattern">{t('grid_edit.grid_pattern')}</label>
                <button
                  className="btn btn-outline-secondary dropdown-toggle btn-block"
                  type="button"
                  id="dropdownMenuButton"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  {this.renderSelectedGridPattern()}
                </button>
                <div className="dropdown-menu grid-division-menu" aria-labelledby="dropdownMenuButton">
                  {this.renderGridDivisionMenu()}
                </div>
              </div>
              <div className="col-lg-6">
                <div className="mr-3 d-inline">
                  <label htmlFor="breakPoint">{t('grid_edit.break_point')}</label>
                </div>
                <div
                  className="btn btn-outline-secondary btn-block dropdown-toggle"
                  type="button"
                  id="dropdownMenuButton"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  {this.renderSelectedBreakPoint()}
                </div>
                <div className="dropdown-menu break-point-menu" aria-labelledby="dropdownMenuButton">
                  {this.renderBreakPointMenu()}
                </div>
              </div>
            </div>
            <div className="row">
              <h1 className="pl-3 w-100">{t('preview')}</h1>
              {this.renderPreview()}
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="grw-modal-footer">
          <div className="ml-auto">
            <button type="button" className="mr-2 btn btn-secondary" onClick={this.cancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={this.pasteCodedGrid}>
              Done
            </button>
          </div>
        </ModalFooter>
      </Modal>
    );
  }

}

GridEditModal.propTypes = {
  onSave: PropTypes.func,
  t: PropTypes.func.isRequired,
};
export default withTranslation('translation', { withRef: true })(GridEditModal);
