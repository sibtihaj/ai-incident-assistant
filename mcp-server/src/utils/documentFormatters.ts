import { Template } from '../tools/templateTools.js';

/**
 * Format a CAN document in human-readable text format
 */
export function formatCANDocument(template: Template, incidentData: Record<string, any>): string {
  const customerName = incidentData.customerName || 'Customer';
  const description = incidentData.description || 'No description provided';
  const severity = incidentData.severity || 'Sev-1';
  const incidentId = incidentData.id || 'TBD';
  
  let document = `# CAN Report\n\n`;
  
  // Get the actual template data - handle both structures
  const templateData = template.template?.can_template || template.template;
  
  // Header section
  if (templateData?.header) {
    const header = templateData.header;
    document += `**Severity:** ${header.severity}\n`;
    document += `**Type:** ${header.type || '-'}\n`;
    document += `**Status:** ${header.status}\n`;
    document += `**Customer:** ${customerName}\n`;
    document += `**Incident ID:** ${incidentId}\n`;
    document += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    
    if (header.reminder) {
      document += `> ${header.reminder}\n\n`;
    }
  }
  
  // Issue Summary
  document += `## Issue Summary\n\n`;
  document += `${description}\n\n`;
  
  // Template sections
  if (templateData?.sections) {
    const sections = templateData.sections;
    
    // Problem Statement
    if (sections.problem_statement) {
      document += `## ${sections.problem_statement.title}\n\n`;
      document += `**${sections.problem_statement.description}**\n\n`;
      const problemContent = incidentData.problem_statement || incidentData.technical_issue || incidentData.issue || sections.problem_statement.content || 'To be filled based on incident details';
      document += `${problemContent}\n\n`;
    }
    
    // Business Impact
    if (sections.business_impact) {
      document += `## ${sections.business_impact.title}\n\n`;
      document += `**${sections.business_impact.description}**\n\n`;
      const impactContent = incidentData.business_impact || incidentData.impact || incidentData.customer_impact || sections.business_impact.content || 'To be filled based on incident details';
      document += `${impactContent}\n\n`;
    }
    
    // Actions
    if (sections.actions) {
      document += `## ${sections.actions.title}\n\n`;
      document += `**${sections.actions.description}**\n\n`;
      const actionsContent = incidentData.actions || incidentData.actions_taken || incidentData.current_actions || sections.actions.content || 'To be filled based on incident details';
      document += `${actionsContent}\n\n`;
    }
    
    // Needs
    if (sections.needs) {
      document += `## ${sections.needs.title}\n\n`;
      document += `**${sections.needs.description}**\n\n`;
      const needsContent = incidentData.needs || incidentData.next_steps || incidentData.required_actions || sections.needs.content || 'To be filled based on incident details';
      document += `${needsContent}\n\n`;
    }
  }
  
  // Metadata
  if (templateData?.metadata) {
    document += `## Metadata\n\n`;
    const metadata = templateData.metadata;
    if (metadata.created_date) {
      document += `**Created Date:** ${metadata.created_date}\n`;
    }
    if (metadata.updated_date) {
      document += `**Updated Date:** ${metadata.updated_date}\n`;
    }
  }
  
  document += `\n---\n`;
  document += `*This CAN document was generated using the ${template.name}*\n`;
  
  return document;
}

/**
 * Format an RCA document in human-readable text format
 */
export function formatRCADocument(template: Template, incidentData: Record<string, any>): string {
  const customerName = incidentData.customerName || 'Customer';
  const description = incidentData.description || 'No description provided';
  const rootCause = incidentData.rootCause || 'Root cause analysis pending';
  const timeline = incidentData.timeline || 'Timeline to be determined';
  const incidentId = incidentData.id || 'TBD';
  
  let document = `# ROOT CAUSE ANALYSIS (RCA)\n\n`;
  document += `**Incident ID:** ${incidentId}\n`;
  document += `**Customer:** ${customerName}\n`;
  document += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  
  document += `## INCIDENT SUMMARY\n\n`;
  document += `${description}\n\n`;
  
  document += `## ROOT CAUSE\n\n`;
  document += `${rootCause}\n\n`;
  
  document += `## TIMELINE\n\n`;
  document += `${timeline}\n\n`;
  
  if (template.template) {
    // Handle different RCA template structures
    const emailTemplate = template.template.email_template;
    const rcaTemplate = template.template.rca_template;
    
    if (emailTemplate) {
      document += `## EMAIL TEMPLATE SECTIONS\n\n`;
      
      if (emailTemplate.greeting) {
        document += `### Greeting\n`;
        document += `**Customer Name:** ${emailTemplate.greeting.customer_name || customerName}\n`;
        document += `**Opening Message:** ${emailTemplate.greeting.opening_message || 'To be filled'}\n\n`;
      }
      
      if (emailTemplate.issue_summary_and_impact) {
        document += `### Issue Summary and Impact\n`;
        // Map user data to template fields intelligently
        const issueSummary = incidentData.issue_summary_and_impact || incidentData.issue_summary || description;
        const timelineDetails = incidentData.timeline_details || incidentData.timeline || timeline;
        const impactDescription = incidentData.impact_description || incidentData.business_impact || 'Impact assessment pending';
        const affectedUsers = incidentData.affected_users_count || incidentData.affectedUsers || 'To be determined';
        
        document += `**Overview Description:** ${issueSummary}\n`;
        document += `**Timeline Details:** ${timelineDetails}\n`;
        document += `**Impact Description:** ${impactDescription}\n`;
        document += `**Affected Users Count:** ${affectedUsers}\n\n`;
      }
      
      if (emailTemplate.actions_taken_to_resolve) {
        document += `### Actions Taken to Resolve\n`;
        const actionsTaken = incidentData.actions_taken_to_resolve || incidentData.actions || 'Actions to be documented';
        const troubleshootingSteps = incidentData.troubleshooting_steps || incidentData.troubleshooting || 'Troubleshooting steps to be documented';
        
        document += `**Resolution Steps:** ${actionsTaken}\n`;
        document += `**Troubleshooting Steps:** ${troubleshootingSteps}\n\n`;
      }
      
      if (emailTemplate.root_cause) {
        document += `### Root Cause Analysis\n`;
        const primaryCause = incidentData.primary_cause || incidentData.rootCause || rootCause;
        const investigationMethod = incidentData.investigation_method || incidentData.investigation || 'Investigation method to be documented';
        const technicalExplanation = incidentData.technical_explanation || incidentData.technical_details || 'Technical explanation to be provided';
        
        document += `**Primary Cause:** ${primaryCause}\n`;
        document += `**Investigation Method:** ${investigationMethod}\n`;
        document += `**Technical Explanation:** ${technicalExplanation}\n\n`;
      }
      
      if (emailTemplate.follow_up_hashicorp) {
        document += `### Hashicorp Follow-up Actions\n`;
        const preventionActions = incidentData.prevention_actions || incidentData.hashicorp_actions || [];
        if (Array.isArray(preventionActions) && preventionActions.length > 0) {
          document += `**Prevention Actions:**\n`;
          preventionActions.forEach((action: string) => {
            document += `- ${action}\n`;
          });
        } else {
          document += `**Prevention Actions:** To be determined\n`;
        }
        document += `\n`;
      }
      
      if (emailTemplate.follow_up_customer) {
        document += `### Customer Follow-up Actions\n`;
        const recommendedActions = incidentData.recommended_actions || incidentData.customer_actions || [];
        if (Array.isArray(recommendedActions) && recommendedActions.length > 0) {
          document += `**Recommended Actions:**\n`;
          recommendedActions.forEach((action: string) => {
            document += `- ${action}\n`;
          });
        } else {
          document += `**Recommended Actions:** To be determined\n`;
        }
        document += `\n`;
      }
    }
    
    // Handle general RCA template structure
    if (rcaTemplate) {
      document += `## RCA TEMPLATE SECTIONS\n\n`;
      
      if (rcaTemplate.issue_summary_and_impact) {
        document += `### Issue Summary and Impact\n`;
        const overviewDescription = incidentData.overview_description || incidentData.issue_summary_and_impact || description;
        document += `**Overview Description:** ${overviewDescription}\n\n`;
      }
      
      if (rcaTemplate.actions_taken_to_resolve) {
        document += `### Actions Taken to Resolve\n`;
        const resolutionSteps = incidentData.resolution_steps || incidentData.actions_taken_to_resolve || 'Resolution steps to be documented';
        const troubleshootingSteps = incidentData.troubleshooting_steps || 'Troubleshooting steps to be documented';
        
        document += `**Resolution Steps:** ${resolutionSteps}\n`;
        document += `**Troubleshooting Steps:** ${troubleshootingSteps}\n\n`;
      }
      
      if (rcaTemplate.root_cause) {
        document += `### Root Cause\n`;
        const primaryCause = incidentData.primary_cause || incidentData.rootCause || rootCause;
        document += `**Primary Cause:** ${primaryCause}\n\n`;
      }
      
      if (rcaTemplate.follow_up_hashicorp) {
        document += `### Hashicorp Follow-up Actions\n`;
        const actions = incidentData.hashicorp_actions || incidentData.follow_up_actions || [];
        if (Array.isArray(actions) && actions.length > 0) {
          document += `**Actions:**\n`;
          actions.forEach((action: string) => {
            document += `- ${action}\n`;
          });
        } else {
          document += `**Actions:** To be determined\n`;
        }
        document += `\n`;
      }
      
      if (rcaTemplate.follow_up_customer) {
        document += `### Customer Follow-up Actions\n`;
        const actions = incidentData.customer_actions || incidentData.recommended_actions || [];
        if (Array.isArray(actions) && actions.length > 0) {
          document += `**Actions:**\n`;
          actions.forEach((action: string) => {
            document += `- ${action}\n`;
          });
        } else {
          document += `**Actions:** To be determined\n`;
        }
        document += `\n`;
      }
    }
  }
  
  document += `\n---\n`;
  document += `*This RCA document was generated using the ${template.name}*\n`;
  
  return document;
} 