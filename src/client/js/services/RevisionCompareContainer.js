import { Container } from 'unstated';

/**
 * Service container for personal settings page (RevisionCompare.jsx)
 * @extends {Container} unstated Container
 */
export default class RevisionCompareContainer extends Container {

  constructor(appContainer, pageContainer) {
    super();

    this.appContainer = appContainer;
    this.pageContainer = pageContainer;

    this.state = {
      errMessage: null,

      fromRevision: null,
      toRevision: null,
    };

    this.initRevisions = this.initRevisions.bind(this);
    this.handleFromRevisionChange = this.handleFromRevisionChange.bind(this);
    this.handleToRevisionChange = this.handleToRevisionChange.bind(this);
  }

  /**
   * Workaround for the mangling in production build to break constructor.name
   */
  static getClassName() {
    return 'RevisionCompareContainer';
  }

  initRevisions(revisions) {
    const fromRevision = revisions.find((it) => it._id === this.compareRevisionIds[0]) || revisions[0];
    const toRevision = revisions.find((it) => it._id === this.compareRevisionIds[1]) || revisions[0];
    this.setState({ fromRevision, toRevision });
  }

  async handleFromRevisionChange(revision) {
    this.setState({ fromRevision: revision });
  }

  async handleToRevisionChange(revision) {
    this.setState({ toRevision: revision });
  }

  get compareRevisionIds() {
    const searchParams = {};
    for (const param of window.location.search?.substr(1)?.split('&')) {
      const [k,v] = param.split('=');
      searchParams[k] = v;
    }
    if (!searchParams['compare']) {
      return [];
    }

    return searchParams['compare'].split('...') || [];
  }

}
