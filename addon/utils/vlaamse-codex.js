import fetch from 'fetch';
import EmberObject from '@ember/object';

const SPARQL_ENDPOINT = 'https://codex.opendata.api.vlaanderen.be:8888/sparql';

async function fetchLegalResources(words, type, page = 0) {
  // TBD/NOTE: in the context of a <http://data.europa.eu/eli/ontology#LegalResource>
  // the eli:cites can have either a <http://xmlns.com/foaf/0.1/Document> or <http://data.europa.eu/eli/ontology#LegalResource>
  // as range (see AP https://data.vlaanderen.be/doc/applicatieprofiel/besluit-publicatie/#Rechtsgrond),
  // but I currently don't think in the editor you'll ever directly work on a LegalResource.
  const totalCountQuery = `
      PREFIX eli: <http://data.europa.eu/eli/ontology#>

      SELECT COUNT(?expressionUri) as ?count
      WHERE {
          ?uri eli:is_realized_by ?expressionUri;
               eli:type_document <${type}>.
        ?expressionUri eli:title ?title .
        ?expressionUri a <http://data.europa.eu/eli/ontology#LegalExpression> .
        ${words.map((word) => `FILTER (CONTAINS(?title, "${word}"))`).join("\n")}
      }`;
  const encodedTotalCountQuery = escape(totalCountQuery);
  const endpointTotalCount = `https://codex.opendata.api.vlaanderen.be:8888/sparql?query=${encodedTotalCountQuery}`;
  const rawTotalCount = await fetch(endpointTotalCount, {headers: {'Accept': 'application/sparql-results+json'}});
  const totalCount = parseInt((await rawTotalCount.json()).results.bindings[0].count.value);

  if (totalCount > 0) {
    const pageSize = 5;
    const query = `
        PREFIX eli: <http://data.europa.eu/eli/ontology#>

        SELECT DISTINCT ?expressionUri as ?uri ?title
        WHERE {
          ?legalResourceUri eli:is_realized_by ?expressionUri;
               eli:type_document <${type}>.
          ?expressionUri eli:title ?title .
          ?expressionUri a <http://data.europa.eu/eli/ontology#LegalExpression> .
          ${words.map((word) => `FILTER (CONTAINS(?title, "${word}"))`).join("\n")}
        }
        LIMIT ${pageSize}
        OFFSET ${page}`;

    const encodedQuery = escape(query);
    const endpoint = `${SPARQL_ENDPOINT}?query=${encodedQuery}`;
    const response = await (await fetch(endpoint, { headers: {'Accept': 'application/sparql-results+json' } })).json();

    const decisions = response.results.bindings.map((binding) => {
      const escapedTitle = escapeValue(binding.title.value);
      return {
        uri: binding.uri,
        title: { ...binding.title, value: escapedTitle }
      };
    });

    return EmberObject.create({
      totalCount,
      decisions
    });
  } else {
    return EmberObject.create({
      totalCount,
      decisions: []
    });
  }
}

function escapeValue(value) {
  const shadowDomElement = document.createElement('textarea');
  shadowDomElement.innerHTML = value;
  return shadowDomElement.textContent;
}

export {
  fetchLegalResources
}
