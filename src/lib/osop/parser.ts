import yaml from 'js-yaml';
import type { IOSOPWorkflow } from './types';

export class OSOPParser {
  /**
   * Parses a YAML string into an OSOP Workflow AST.
   * In a real implementation, this would also validate against the JSON Schema using Ajv or Zod.
   */
  static parse(yamlString: string): IOSOPWorkflow {
    try {
      const doc = yaml.load(yamlString) as any;
      
      // Basic validation
      if (!doc.osop_version || !doc.id || !doc.nodes || !doc.edges) {
        throw new Error('Invalid OSOP file: Missing required fields (osop_version, id, nodes, edges)');
      }

      return doc as IOSOPWorkflow;
    } catch (error) {
      console.error('Failed to parse OSOP YAML:', error);
      throw error;
    }
  }

  /**
   * Generates a Story View (Human-readable narrative) from the AST.
   */
  static generateStory(workflow: IOSOPWorkflow): string {
    let story = `# ${workflow.name} (Story View)\n\n`;
    if (workflow.description) {
      story += `${workflow.description}\n\n`;
    }

    story += `## 流程步驟\n\n`;
    
    // Sort nodes topologically (simplified for demo: just use the order in the array)
    workflow.nodes.forEach((node, index) => {
      const role = node.role ? `[${node.role}] ` : '';
      const typeIcon = this.getTypeIcon(node.type);
      story += `${index + 1}. **${typeIcon} ${node.id}** ${role}: ${node.purpose}\n`;
      
      if (node.handoff?.summary_for_next_node) {
        story += `   > 🤝 交接說明: ${node.handoff.summary_for_next_node}\n`;
      }
      if (node.success_criteria && node.success_criteria.length > 0) {
        story += `   > ✅ 成功條件: ${node.success_criteria.join(', ')}\n`;
      }
    });

    return story;
  }

  private static getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      human: '👤',
      agent: '🤖',
      api: '🌐',
      cli: '💻',
      db: '🗄️',
      git: '🐙',
      docker: '🐳',
      cicd: '🚀',
      mcp: '🔌'
    };
    return icons[type] || '⚙️';
  }
}
