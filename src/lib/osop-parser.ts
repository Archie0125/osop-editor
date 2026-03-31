import yaml from 'js-yaml';
import { OsopWorkflow } from '../types/osop';

export function parseOsop(yamlString: string): OsopWorkflow | null {
  try {
    const parsed = yaml.load(yamlString) as any;
    if (!parsed || !parsed.nodes || !parsed.edges) {
      console.warn("Invalid OSOP format: missing nodes or edges");
      return null;
    }
    // Normalize: some files use `osop` instead of `osop_version`
    if (!parsed.osop_version && parsed.osop) {
      parsed.osop_version = parsed.osop;
    }
    if (!parsed.id && parsed.name) {
      parsed.id = parsed.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    }
    return parsed as OsopWorkflow;
  } catch (e) {
    console.error("Failed to parse OSOP YAML", e);
    return null;
  }
}

export function serializeOsop(workflow: OsopWorkflow): string {
  return yaml.dump(workflow, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}
