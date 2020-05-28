import fetch from 'fetch';
import EmberObject from '@ember/object';
import { LEGISLATION_TYPE_CONCEPTS } from './legislation-types';

const SPARQL_ENDPOINT = 'https://codex.opendata.api.vlaanderen.be:8888/sparql';

class Decision {
  constructor({ uri, legislationTypeUri, title, publicationDate, documentDate }) {
    this.uri = uri;
    this.legislationType = LEGISLATION_TYPE_CONCEPTS.find(t => t.value == legislationTypeUri);
    this.title = title;
    this.publicationDate = publicationDate;
    this.documentDate = documentDate;
  }

  get fullTitle() {
    return `${this.legislationType.label} ${this.title}`;
  }
}

async function fetchLegalResources(words, { type }, pageNumber = 0, pageSize = 5) {
  // TBD/NOTE: in the context of a <http://data.europa.eu/eli/ontology#LegalResource>
  // the eli:cites can have either a <http://xmlns.com/foaf/0.1/Document> or <http://data.europa.eu/eli/ontology#LegalResource>
  // as range (see AP https://data.vlaanderen.be/doc/applicatieprofiel/besluit-publicatie/#Rechtsgrond),
  // but I currently don't think in the editor you'll ever directly work on a LegalResource.
  const totalCountQuery = `
      PREFIX eli: <http://data.europa.eu/eli/ontology#>

      SELECT COUNT(?expressionUri) as ?count
      WHERE {
        ?legalResourceUri eli:type_document <${type}> ;
                          eli:is_realized_by ?expressionUri .
        ?expressionUri a <http://data.europa.eu/eli/ontology#LegalExpression> .
        ?expressionUri eli:title ?title .
        ${words.map((word) => `FILTER (CONTAINS(?title, "${word}"))`).join("\n")}
      }`;
  const encodedTotalCountQuery = escape(totalCountQuery);
  const endpointTotalCount = `https://codex.opendata.api.vlaanderen.be:8888/sparql?query=${encodedTotalCountQuery}`;
  const rawTotalCount = await fetch(endpointTotalCount, {headers: {'Accept': 'application/sparql-results+json'}});
  const totalCount = parseInt((await rawTotalCount.json()).results.bindings[0].count.value);

  if (totalCount > 0) {
    const query = `
        PREFIX eli: <http://data.europa.eu/eli/ontology#>

        SELECT DISTINCT ?expressionUri as ?uri ?title ?publicationDate ?documentDate
        WHERE {
          ?legalResourceUri eli:type_document <${type}> ;
                            eli:is_realized_by ?expressionUri .
          ?expressionUri a <http://data.europa.eu/eli/ontology#LegalExpression> .
          ?expressionUri eli:title ?title .
          ${words.map((word) => `FILTER (CONTAINS(?title, "${word}"))`).join("\n")}

          OPTIONAL {
            ?expressionUri eli:date_publication ?publicationDate .
          }

          OPTIONAL {
            ?legalResourceUri eli:date_document ?documentDate .
          }
        }
        LIMIT ${pageSize} OFFSET ${pageNumber}`;

    const encodedQuery = escape(query);
    const endpoint = `${SPARQL_ENDPOINT}?query=${encodedQuery}`;
    const response = await fetch(endpoint, { headers: {'Accept': 'application/sparql-results+json' } });

    if (response.ok) {
      const jsonResponse = await response.json();
      const decisions = jsonResponse.results.bindings.map((binding) => {
        const escapedTitle = escapeValue(binding.title.value);
        const publicationDate = dateValue(binding.publicationDate && binding.publicationDate.value);
        const documentDate = dateValue(binding.documentDate && binding.documentDate.value);
        return new Decision({
          uri: binding.uri.value,
          title: escapedTitle,
          legislationTypeUri: type,
          publicationDate,
          documentDate
        });
      });

      return EmberObject.create({
        totalCount,
        decisions
      });
    } else {
      throw new Error(`Request to Vlaamse Codex was unsuccessful: [${response.status}] ${response.statusText}`);
    }
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

function dateValue(value) {
  if (value) {
    try {
      return new Date(Date.parse(value));
    } catch (e) {
      warn(`Error parsing date ${value}: ${e.message}`, { id: 'date-parsing-error' });
      return null;
    }
  } else {
    return null;
  }
}

export {
  fetchLegalResources
}
