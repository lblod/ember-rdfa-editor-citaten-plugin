const citatenMarkSpec = {
  matchers: [
    {
      tag: 'span',
      attributeBuilder: (node) => {
        if (
          node.dataset &&
          Object.prototype.hasOwnProperty.call(node.dataset, 'citatenText')
        ) {
          return {
            text: node.dataset.citatenText,
            legislationTypeUri: node.dataset.legislationTypeUri,
          };
        }
      },
    },
  ],
  name: 'citaten',
  priority: 100,
  renderSpec(mark) {
    return {
      tag: 'span',
      attributes: {
        'data-citaten-text': mark.attributes.text,
        'data-legislation-type-uri': mark.attributes.legislationTypeUri,
      },
      children: [0],
    };
  },
};

export default citatenMarkSpec;
