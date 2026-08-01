import {
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from "graphql";
import { buildEntityIndex, entityPath, type EntityKind } from "@/lib/kgo/entities";
import { buildKnowledgeGraph } from "@/lib/kgo/graph";
import { buildProgrammaticHubs } from "@/lib/kgo/programmatic";
import { getPublicArchiveRecord, getPublicArchiveRecords, recordDescription } from "@/lib/kgo/records";
import { absoluteUrl } from "@/lib/kgo/site";

const RecordType = new GraphQLObjectType({
  name: "Record",
  fields: {
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    creator: { type: GraphQLString },
    sourceName: { type: GraphQLString },
    url: { type: GraphQLString },
    knowledgeAreas: { type: new GraphQLList(GraphQLString) },
    communities: { type: new GraphQLList(GraphQLString) },
    languages: { type: new GraphQLList(GraphQLString) },
    regions: { type: new GraphQLList(GraphQLString) },
    countries: { type: new GraphQLList(GraphQLString) },
    sameAs: { type: new GraphQLList(GraphQLString) },
    wikidata: { type: GraphQLString },
    orcid: { type: GraphQLString },
    ror: { type: GraphQLString },
    doi: { type: GraphQLString },
  },
});

const EntityType = new GraphQLObjectType({
  name: "Entity",
  fields: {
    kind: { type: GraphQLString },
    slug: { type: GraphQLString },
    label: { type: GraphQLString },
    description: { type: GraphQLString },
    url: { type: GraphQLString },
    recordCount: { type: GraphQLInt },
    sameAs: { type: new GraphQLList(GraphQLString) },
  },
});

const HubType = new GraphQLObjectType({
  name: "ExploreHub",
  fields: {
    slug: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    url: { type: GraphQLString },
    recordCount: { type: GraphQLInt },
  },
});

const EdgeType = new GraphQLObjectType({
  name: "GraphEdge",
  fields: {
    from: { type: GraphQLString },
    to: { type: GraphQLString },
    relation: { type: GraphQLString },
  },
});

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    record: {
      type: RecordType,
      args: { id: { type: GraphQLString } },
      resolve: async (_source, args: { id?: string }) => {
        if (!args.id) return null;
        const record = await getPublicArchiveRecord(args.id);
        if (!record) return null;
        return mapRecord(record);
      },
    },
    records: {
      type: new GraphQLList(RecordType),
      args: { limit: { type: GraphQLInt } },
      resolve: async (_source, args: { limit?: number }) => {
        const records = await getPublicArchiveRecords();
        return records.slice(0, Math.min(args.limit || 50, 200)).map(mapRecord);
      },
    },
    entities: {
      type: new GraphQLList(EntityType),
      args: { kind: { type: GraphQLString }, limit: { type: GraphQLInt } },
      resolve: async (_source, args: { kind?: string; limit?: number }) => {
        const entities = await buildEntityIndex();
        const filtered = args.kind
          ? entities.filter((entity) => entity.kind === (args.kind as EntityKind))
          : entities;
        return filtered.slice(0, Math.min(args.limit || 100, 500)).map((entity) => ({
          kind: entity.kind,
          slug: entity.slug,
          label: entity.label,
          description: entity.description,
          url: absoluteUrl(entityPath(entity.kind, entity.slug)),
          recordCount: entity.recordIds.length,
          sameAs: entity.sameAs,
        }));
      },
    },
    exploreHubs: {
      type: new GraphQLList(HubType),
      args: { limit: { type: GraphQLInt } },
      resolve: async (_source, args: { limit?: number }) => {
        const hubs = await buildProgrammaticHubs();
        return hubs.slice(0, Math.min(args.limit || 100, 500)).map((hub) => ({
          slug: hub.slug,
          title: hub.title,
          description: hub.description,
          url: absoluteUrl(`/explore/${hub.slug}`),
          recordCount: hub.recordIds.length,
        }));
      },
    },
    graphEdges: {
      type: new GraphQLList(EdgeType),
      args: { limit: { type: GraphQLInt } },
      resolve: async (_source, args: { limit?: number }) => {
        const graph = await buildKnowledgeGraph();
        return graph.edges.slice(0, Math.min(args.limit || 200, 2000));
      },
    },
  },
});

function mapRecord(record: Awaited<ReturnType<typeof getPublicArchiveRecord>>) {
  if (!record) return null;
  return {
    id: record.id,
    title: record.title,
    description: recordDescription(record),
    creator: record.creator || null,
    sourceName: record.sourceName || null,
    url: absoluteUrl(`/records/${record.id}`),
    knowledgeAreas: record.knowledgeAreas || [],
    communities: record.communityOrCulturalGroup || [],
    languages: record.language || [],
    regions: record.region || [],
    countries: record.country || [],
    sameAs: [
      record.sourceUrl,
      record.doi ? `https://doi.org/${record.doi}` : "",
      record.externalIds?.wikidata,
      record.externalIds?.orcid,
      record.externalIds?.ror,
      record.externalIds?.openAlex,
      record.externalIds?.wikipedia,
    ].filter(Boolean),
    wikidata: record.externalIds?.wikidata || null,
    orcid: record.externalIds?.orcid || null,
    ror: record.externalIds?.ror || null,
    doi: record.doi || null,
  };
}

export const kgoSchema = new GraphQLSchema({ query: QueryType });

export async function runKgoGraphql(query: string, variables?: Record<string, unknown>) {
  return graphql({
    schema: kgoSchema,
    source: query,
    variableValues: variables,
  });
}
