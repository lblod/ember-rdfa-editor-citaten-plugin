import Component from '@glimmer/component';

export default class CitaatCardPagination extends Component {
  get rangeStart() {
    return this.args.pageNumber * this.args.pageSize + 1;
  }

  get rangeEnd() {
    const end = this.rangeStart + this.args.pageSize - 1;
    return end > this.args.total ? this.args.total : end;
  }

  get isFirstPage() {
    return this.args.pageNumber == 0;
  }

  get isLastPage() {
    return this.rangeEnd == this.args.total;
  }
}
