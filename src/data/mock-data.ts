import { Template, DASheet, Vendor } from '../types/da-types';

export const defaultTemplates: Template[] = [
  {
    id: 'template-1',
    name: 'License Agreement Template',
    type: 'License',
    description: 'Standard template for software licensing decisions',
    isDeployed: true,
    categories: [
      {
        id: 'quality',
        name: 'Quality',
        parameters: [
          {
            id: 'q1',
            name: 'Development needs',
            weightage: 10,
            comment: 'Development needs to be done from scratch as an intermediate. 1: Not Capable - 2)'
          },
          {
            id: 'q2',
            name: 'Code-Low-Code Platform',
            weightage: 10,
            comment: 'Yes/No/Partially - No code/low-code solution with interactive dashboard'
          },
          {
            id: 'q3',
            name: 'Template implementation',
            weightage: 5,
            comment: 'Yes, the templates are dynamically parameterized'
          },
          {
            id: 'q4',
            name: 'Technical support',
            weightage: 5,
            comment: 'Documentation or partner support'
          }
        ]
      },
      {
        id: 'cost',
        name: 'Cost',
        parameters: [
          {
            id: 'c1',
            name: 'Licensing Cost',
            weightage: 10,
            comment: 'Upfront + AMC (License = x AM and One Time Cost = y, Cost with budgeting module z)'
          },
          {
            id: 'c2',
            name: 'One Time Cost',
            weightage: 5,
            comment: 'Implementation and setup costs'
          }
        ]
      },
      {
        id: 'delivery',
        name: 'Delivery',
        parameters: [
          {
            id: 'd1',
            name: 'Integration capability',
            weightage: 10,
            comment: 'System scope is only part of end-to-end process - different systems - need to integrate with SAC'
          },
          {
            id: 'd2',
            name: 'Implementation timeline',
            weightage: 5,
            comment: 'Go-live within 6 weeks and 3 months iterations'
          }
        ]
      },
      {
        id: 'management',
        name: 'Management',
        parameters: [
          {
            id: 'm1',
            name: 'Licensing Model',
            weightage: 5,
            comment: 'User based license model'
          },
          {
            id: 'm2',
            name: 'Network Partners',
            weightage: 10,
            comment: 'Confluence plus Network (Multiple stakeholders across entities in market)'
          }
        ]
      },
      {
        id: 'safety',
        name: 'Safety',
        parameters: [
          {
            id: 's1',
            name: 'Security Certification',
            weightage: 10,
            comment: 'Has Magic Quadrant for Financial Planning (Not in Magic Quadrant for Financial Planning)'
          },
          {
            id: 's2',
            name: 'Data compliance',
            weightage: 5,
            comment: 'Satisfies Security Certification - India Data Centre Level 3 SOC 2 Type 1 & 2, ISO/IEC 27001'
          }
        ]
      }
    ],
    customFields: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'template-2',
    name: 'Custom Development Template',
    type: 'Custom Development',
    description: 'Template for custom software development vendor evaluation',
    isDeployed: true,
    categories: [
      {
        id: 'quality',
        name: 'Quality',
        parameters: [
          {
            id: 'q1',
            name: 'Technical Expertise',
            weightage: 15,
            comment: 'Development team skill level and certifications'
          },
          {
            id: 'q2',
            name: 'Code Quality Standards',
            weightage: 10,
            comment: 'Adherence to coding standards and best practices'
          },
          {
            id: 'q3',
            name: 'Testing Capabilities',
            weightage: 10,
            comment: 'Automated testing and QA processes'
          }
        ]
      },
      {
        id: 'cost',
        name: 'Cost',
        parameters: [
          {
            id: 'c1',
            name: 'Development Cost',
            weightage: 15,
            comment: 'Total development and customization costs'
          },
          {
            id: 'c2',
            name: 'Maintenance Cost',
            weightage: 5,
            comment: 'Annual maintenance and support fees'
          }
        ]
      },
      {
        id: 'delivery',
        name: 'Delivery',
        parameters: [
          {
            id: 'd1',
            name: 'Project Timeline',
            weightage: 10,
            comment: 'Ability to meet project deadlines'
          },
          {
            id: 'd2',
            name: 'Agile Methodology',
            weightage: 5,
            comment: 'Use of agile development practices'
          }
        ]
      },
      {
        id: 'management',
        name: 'Management',
        parameters: [
          {
            id: 'm1',
            name: 'Project Management',
            weightage: 10,
            comment: 'Project management capabilities and tools'
          },
          {
            id: 'm2',
            name: 'Communication',
            weightage: 5,
            comment: 'Regular updates and stakeholder communication'
          }
        ]
      },
      {
        id: 'safety',
        name: 'Safety',
        parameters: [
          {
            id: 's1',
            name: 'Security Standards',
            weightage: 10,
            comment: 'Compliance with security standards (ISO 27001, SOC 2)'
          },
          {
            id: 's2',
            name: 'Data Protection',
            weightage: 5,
            comment: 'Data encryption and protection measures'
          }
        ]
      }
    ],
    customFields: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'template-3',
    name: 'SaaS Solution Template',
    type: 'SaaS',
    description: 'Template for SaaS product evaluation',
    isDeployed: true,
    categories: [
      {
        id: 'quality',
        name: 'Quality',
        parameters: [
          {
            id: 'q1',
            name: 'Feature Completeness',
            weightage: 15,
            comment: 'Coverage of required features and functionality'
          },
          {
            id: 'q2',
            name: 'User Experience',
            weightage: 10,
            comment: 'Ease of use and interface design'
          },
          {
            id: 'q3',
            name: 'Customization Options',
            weightage: 5,
            comment: 'Ability to customize and configure'
          }
        ]
      },
      {
        id: 'cost',
        name: 'Cost',
        parameters: [
          {
            id: 'c1',
            name: 'Subscription Cost',
            weightage: 15,
            comment: 'Monthly/annual subscription fees per user'
          },
          {
            id: 'c2',
            name: 'Implementation Cost',
            weightage: 5,
            comment: 'Setup and onboarding costs'
          }
        ]
      },
      {
        id: 'delivery',
        name: 'Delivery',
        parameters: [
          {
            id: 'd1',
            name: 'Deployment Speed',
            weightage: 10,
            comment: 'Time to deploy and go live'
          },
          {
            id: 'd2',
            name: 'Integration APIs',
            weightage: 10,
            comment: 'API availability and ease of integration'
          }
        ]
      },
      {
        id: 'management',
        name: 'Management',
        parameters: [
          {
            id: 'm1',
            name: 'Vendor Reputation',
            weightage: 10,
            comment: 'Market presence and customer reviews'
          },
          {
            id: 'm2',
            name: 'Support Quality',
            weightage: 5,
            comment: '24/7 support and SLA guarantees'
          }
        ]
      },
      {
        id: 'safety',
        name: 'Safety',
        parameters: [
          {
            id: 's1',
            name: 'Data Security',
            weightage: 10,
            comment: 'Encryption, backup, and disaster recovery'
          },
          {
            id: 's2',
            name: 'Compliance',
            weightage: 5,
            comment: 'GDPR, HIPAA, SOC 2 compliance'
          }
        ]
      }
    ],
    customFields: [],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: 'template-4',
    name: 'Hardware Procurement Template',
    type: 'License',
    description: 'Template for hardware and equipment vendor evaluation',
    isDeployed: false, // Draft template - not published
    categories: [
      {
        id: 'quality',
        name: 'Quality',
        parameters: [
          {
            id: 'q1',
            name: 'Product Quality',
            weightage: 20,
            comment: 'Hardware quality standards and certifications'
          },
          {
            id: 'q2',
            name: 'Reliability',
            weightage: 10,
            comment: 'Mean time between failures (MTBF) and warranty'
          }
        ]
      },
      {
        id: 'cost',
        name: 'Cost',
        parameters: [
          {
            id: 'c1',
            name: 'Unit Price',
            weightage: 20,
            comment: 'Per unit cost including taxes'
          },
          {
            id: 'c2',
            name: 'Maintenance Cost',
            weightage: 10,
            comment: 'Annual maintenance and spare parts cost'
          }
        ]
      },
      {
        id: 'delivery',
        name: 'Delivery',
        parameters: [
          {
            id: 'd1',
            name: 'Lead Time',
            weightage: 15,
            comment: 'Time from order to delivery'
          },
          {
            id: 'd2',
            name: 'Installation Support',
            weightage: 5,
            comment: 'On-site installation and setup assistance'
          }
        ]
      },
      {
        id: 'management',
        name: 'Management',
        parameters: [
          {
            id: 'm1',
            name: 'Vendor Track Record',
            weightage: 10,
            comment: 'Past performance and customer references'
          },
          {
            id: 'm2',
            name: 'After-sales Support',
            weightage: 5,
            comment: 'Customer support and helpdesk availability'
          }
        ]
      },
      {
        id: 'safety',
        name: 'Safety',
        parameters: [
          {
            id: 's1',
            name: 'Safety Certifications',
            weightage: 5,
            comment: 'CE, UL, FCC certifications'
          }
        ]
      }
    ],
    customFields: [],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10')
  }
];

// Helper function to create empty vendor scores based on template
const createEmptyVendorScores = (template: Template) => {
  const scores: any = {};
  
  template.categories.forEach(category => {
    scores[category.id] = {
      evaluations: category.parameters.map(param => ({
        parameterId: param.id,
        evalScore: 0,
        result: 0,
        vendorComment: ''
      })),
      subTotal: 0
    };
  });
  
  return scores;
};

export const mockDASheets: DASheet[] = [
  {
    id: 'da-1',
    name: 'ERP System Evaluation Q1 2024',
    type: 'License',
    status: 'Draft',
    templateId: 'template-1',
    vendors: [
      {
        id: 'vendor-1',
        name: 'ServiceNow',
        scores: {
          quality: {
            evaluations: [
              { parameterId: 'q1', evalScore: 8, result: 80, vendorComment: 'Development needs to be done from scratch as an intermediate. 1: Not Capable - 3)' },
              { parameterId: 'q2', evalScore: 10, result: 100, vendorComment: 'Yes, the templates can be created as per requirement' },
              { parameterId: 'q3', evalScore: 10, result: 50, vendorComment: 'Yes/No/Partially - No code/low-code solution with interactive dashboard' },
              { parameterId: 'q4', evalScore: 10, result: 50, vendorComment: 'Yes - No customization NW Level - 1 : No customization SOC 2 Type 1 or 2)' }
            ],
            subTotal: 280
          },
          cost: {
            evaluations: [
              { parameterId: 'c1', evalScore: 8, result: 80, vendorComment: 'License = 5 AM and One Time Cost = Y' },
              { parameterId: 'c2', evalScore: 10, result: 50, vendorComment: 'Zone Time Cost' }
            ],
            subTotal: 130
          },
          delivery: {
            evaluations: [
              { parameterId: 'd1', evalScore: 2, result: 20, vendorComment: 'System scope is only part of end-to-end process - different systems - need to integrate with SAC' },
              { parameterId: 'd2', evalScore: 10, result: 50, vendorComment: '12 Weeks and 3 months iterations' }
            ],
            subTotal: 70
          },
          management: {
            evaluations: [
              { parameterId: 'm1', evalScore: 8, result: 40, vendorComment: 'User based license model' },
              { parameterId: 'm2', evalScore: 10, result: 100, vendorComment: 'Limited Implementation Partners in market' }
            ],
            subTotal: 140
          },
          safety: {
            evaluations: [
              { parameterId: 's1', evalScore: 2, result: 20, vendorComment: 'Not in Magic Quadrant for Financial Planning' },
              { parameterId: 's2', evalScore: 10, result: 50, vendorComment: 'UK Data Centre Level 3 SOC 2 Type 1 & 2, ISO/IEC 27001' }
            ],
            subTotal: 70
          }
        },
        overallScore: 690,
        notes: 'Strong integration capabilities'
      },
      {
        id: 'vendor-2',
        name: 'PaaS/Comp',
        scores: {
          quality: {
            evaluations: [
              { parameterId: 'q1', evalScore: 9, result: 90, vendorComment: 'Development needs to be done from scratch as an intermediate' },
              { parameterId: 'q2', evalScore: 10, result: 100, vendorComment: 'Development needs to be done from scratch as an Intermediate. 1: Not Capable - 2)' },
              { parameterId: 'q3', evalScore: 10, result: 50, vendorComment: 'Yes/No/Partially - No code/low-code Platform creation capabilities are less as they are replacement' },
              { parameterId: 'q4', evalScore: 10, result: 50, vendorComment: 'No templates implementation partners are available in the market' }
            ],
            subTotal: 290
          },
          cost: {
            evaluations: [
              { parameterId: 'c1', evalScore: 9, result: 90, vendorComment: 'License = 6 AM' },
              { parameterId: 'c2', evalScore: 10, result: 50, vendorComment: '5 TM Cost' }
            ],
            subTotal: 140
          },
          delivery: {
            evaluations: [
              { parameterId: 'd1', evalScore: 2, result: 20, vendorComment: 'Business scope is early part of end-to-end process - different systems' },
              { parameterId: 'd2', evalScore: 2, result: 10, vendorComment: '24 Weeks and 6 months iterations' }
            ],
            subTotal: 30
          },
          management: {
            evaluations: [
              { parameterId: 'm1', evalScore: 10, result: 50, vendorComment: 'Limited license model' },
              { parameterId: 'm2', evalScore: 10, result: 100, vendorComment: 'Not yet done On-Premise Apex environment' }
            ],
            subTotal: 150
          },
          safety: {
            evaluations: [
              { parameterId: 's1', evalScore: 2, result: 20, vendorComment: 'Not in Magic Quadrant for Financial Planning' },
              { parameterId: 's2', evalScore: 10, result: 50, vendorComment: 'Leader in magic quadrant for Financial Planning. Yes - On-Premise Apex environment' }
            ],
            subTotal: 70
          }
        },
        overallScore: 680,
        notes: 'Cost-effective solution'
      }
    ],
    notes: 'Initial evaluation for Q1 procurement',
    version: 1,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-15'),
    createdBy: 'Sarah Johnson',
    sharedWith: [
      {
        email: 'john.manager@company.com',
        accessLevel: 'edit',
        sharedAt: new Date('2024-03-02')
      },
      {
        email: 'mary.analyst@company.com',
        accessLevel: 'view',
        sharedAt: new Date('2024-03-05')
      }
    ]
  },
  {
    id: 'da-2',
    name: 'Cloud Migration Platform Review',
    type: 'SaaS',
    status: 'Draft',
    templateId: 'template-3',
    vendors: [],
    notes: '',
    version: 1,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    createdBy: 'Michael Chen',
    sharedWith: []
  }
];