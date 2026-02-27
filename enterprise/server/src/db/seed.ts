import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, getConnection, closePool } from './index.js';
import logger from '../utils/logger.js';

async function seed() {
  await initializeDatabase();
  const connection = await getConnection();

  logger.info('Seeding Oracle database...');

  try {
    // Check if already seeded
    const userCount = await connection.execute<{ CNT: number }>(
      'SELECT COUNT(*) AS CNT FROM users'
    );
    if ((userCount.rows?.[0]?.CNT ?? 0) > 0) {
      logger.info('Database already seeded, skipping...');
      return;
    }

    // ─── Create Users ─────────────────────────────────────────────
    const adminId = uuidv4();
    const userId = uuidv4();
    const adminPassword = await bcrypt.hash('Admin@1234', 12);
    const userPassword = await bcrypt.hash('User@1234', 12);

    await connection.execute(
      `INSERT INTO users (id, emp_code, email, password_hash, role)
       VALUES (:id, :empCode, :email, :passwordHash, :role)`,
      { id: adminId, empCode: 'ADMIN001', email: 'admin@in.honda', passwordHash: adminPassword, role: 'admin' }
    );

    await connection.execute(
      `INSERT INTO users (id, emp_code, email, password_hash, role)
       VALUES (:id, :empCode, :email, :passwordHash, :role)`,
      { id: userId, empCode: 'USER001', email: 'user@in.honda', passwordHash: userPassword, role: 'user' }
    );

    logger.info('Created admin and user accounts');

    // ─── Create Templates ─────────────────────────────────────────
    const templates = [
      {
        id: uuidv4(),
        name: 'License Agreement Template',
        type: 'License',
        description: 'Standard template for software licensing decisions',
        isDeployed: true,
        categories: [
          {
            name: 'Quality',
            parameters: [
              { name: 'Development needs', weightage: 10, comment: 'Development needs assessment' },
              { name: 'Code-Low-Code Platform', weightage: 10, comment: 'No code/low-code solution with interactive dashboard' },
              { name: 'Template implementation', weightage: 5, comment: 'Templates are dynamically parameterized' },
              { name: 'Technical support', weightage: 5, comment: 'Documentation or partner support' },
            ],
          },
          {
            name: 'Cost',
            parameters: [
              { name: 'Licensing Cost', weightage: 10, comment: 'Upfront + AMC costs' },
              { name: 'One Time Cost', weightage: 5, comment: 'Implementation and setup costs' },
            ],
          },
          {
            name: 'Delivery',
            parameters: [
              { name: 'Integration capability', weightage: 10, comment: 'System integration capability' },
              { name: 'Implementation timeline', weightage: 5, comment: 'Go-live timeline' },
            ],
          },
          {
            name: 'Management',
            parameters: [
              { name: 'Licensing Model', weightage: 5, comment: 'User based license model' },
              { name: 'Network Partners', weightage: 10, comment: 'Multiple stakeholders across entities' },
            ],
          },
          {
            name: 'Safety',
            parameters: [
              { name: 'Security Certification', weightage: 10, comment: 'Magic Quadrant standing' },
              { name: 'Data compliance', weightage: 5, comment: 'SOC 2, ISO/IEC 27001' },
            ],
          },
        ],
      },
      {
        id: uuidv4(),
        name: 'Custom Development Template',
        type: 'Custom Development',
        description: 'Template for custom software development vendor evaluation',
        isDeployed: true,
        categories: [
          {
            name: 'Quality',
            parameters: [
              { name: 'Technical Expertise', weightage: 15, comment: 'Team skill level and certifications' },
              { name: 'Code Quality Standards', weightage: 10, comment: 'Coding standards and best practices' },
              { name: 'Testing Capabilities', weightage: 10, comment: 'Automated testing and QA' },
            ],
          },
          {
            name: 'Cost',
            parameters: [
              { name: 'Development Cost', weightage: 15, comment: 'Total development costs' },
              { name: 'Maintenance Cost', weightage: 5, comment: 'Annual maintenance fees' },
            ],
          },
          {
            name: 'Delivery',
            parameters: [
              { name: 'Project Timeline', weightage: 10, comment: 'Ability to meet deadlines' },
              { name: 'Agile Methodology', weightage: 5, comment: 'Agile development practices' },
            ],
          },
          {
            name: 'Management',
            parameters: [
              { name: 'Project Management', weightage: 10, comment: 'PM capabilities and tools' },
              { name: 'Communication', weightage: 5, comment: 'Stakeholder communication' },
            ],
          },
          {
            name: 'Safety',
            parameters: [
              { name: 'Security Standards', weightage: 10, comment: 'ISO 27001, SOC 2 compliance' },
              { name: 'Data Protection', weightage: 5, comment: 'Encryption and protection measures' },
            ],
          },
        ],
      },
      {
        id: uuidv4(),
        name: 'SaaS Solution Template',
        type: 'SaaS',
        description: 'Template for SaaS product evaluation',
        isDeployed: true,
        categories: [
          {
            name: 'Quality',
            parameters: [
              { name: 'Feature Completeness', weightage: 15, comment: 'Coverage of required features' },
              { name: 'User Experience', weightage: 10, comment: 'Ease of use and design' },
              { name: 'Customization Options', weightage: 5, comment: 'Ability to customize' },
            ],
          },
          {
            name: 'Cost',
            parameters: [
              { name: 'Subscription Cost', weightage: 15, comment: 'Monthly/annual subscription fees' },
              { name: 'Implementation Cost', weightage: 5, comment: 'Setup and onboarding costs' },
            ],
          },
          {
            name: 'Delivery',
            parameters: [
              { name: 'Deployment Speed', weightage: 10, comment: 'Time to deploy and go live' },
              { name: 'Integration APIs', weightage: 10, comment: 'API availability and ease' },
            ],
          },
          {
            name: 'Management',
            parameters: [
              { name: 'Vendor Reputation', weightage: 10, comment: 'Market presence and reviews' },
              { name: 'Support Quality', weightage: 5, comment: '24/7 support and SLA' },
            ],
          },
          {
            name: 'Safety',
            parameters: [
              { name: 'Data Security', weightage: 10, comment: 'Encryption, backup, disaster recovery' },
              { name: 'Compliance', weightage: 5, comment: 'GDPR, HIPAA, SOC 2' },
            ],
          },
        ],
      },
      {
        id: uuidv4(),
        name: 'Hardware Procurement Template',
        type: 'License',
        description: 'Template for hardware and equipment vendor evaluation',
        isDeployed: false,
        categories: [
          {
            name: 'Quality',
            parameters: [
              { name: 'Product Quality', weightage: 20, comment: 'Hardware quality standards' },
              { name: 'Reliability', weightage: 10, comment: 'MTBF and warranty' },
            ],
          },
          {
            name: 'Cost',
            parameters: [
              { name: 'Unit Price', weightage: 20, comment: 'Per unit cost including taxes' },
              { name: 'Maintenance Cost', weightage: 10, comment: 'Annual maintenance cost' },
            ],
          },
          {
            name: 'Delivery',
            parameters: [
              { name: 'Lead Time', weightage: 15, comment: 'Order to delivery time' },
              { name: 'Installation Support', weightage: 5, comment: 'On-site installation' },
            ],
          },
          {
            name: 'Management',
            parameters: [
              { name: 'Vendor Track Record', weightage: 10, comment: 'Past performance' },
              { name: 'After-sales Support', weightage: 5, comment: 'Helpdesk availability' },
            ],
          },
          {
            name: 'Safety',
            parameters: [
              { name: 'Safety Certifications', weightage: 5, comment: 'CE, UL, FCC certifications' },
            ],
          },
        ],
      },
    ];

    for (const template of templates) {
      await connection.execute(
        `INSERT INTO templates (id, name, type, description, is_deployed, created_by)
         VALUES (:id, :name, :type, :description, :isDeployed, :createdBy)`,
        {
          id: template.id,
          name: template.name,
          type: template.type,
          description: template.description,
          isDeployed: template.isDeployed ? 1 : 0,
          createdBy: adminId,
        }
      );

      for (let catIdx = 0; catIdx < template.categories.length; catIdx++) {
        const cat = template.categories[catIdx];
        const categoryId = uuidv4();

        await connection.execute(
          `INSERT INTO categories (id, template_id, name, sort_order)
           VALUES (:id, :templateId, :name, :sortOrder)`,
          { id: categoryId, templateId: template.id, name: cat.name, sortOrder: catIdx }
        );

        for (let paramIdx = 0; paramIdx < cat.parameters.length; paramIdx++) {
          const param = cat.parameters[paramIdx];
          await connection.execute(
            `INSERT INTO judgment_parameters (id, category_id, name, weightage, comment, sort_order)
             VALUES (:id, :categoryId, :name, :weightage, :comment, :sortOrder)`,
            { id: uuidv4(), categoryId, name: param.name, weightage: param.weightage, comment: param.comment, sortOrder: paramIdx }
          );
        }
      }
    }

    logger.info(`Created ${templates.length} templates`);

    // ─── Create Sample DA Sheet ────────────────────────────────────
    const sheetId = uuidv4();
    await connection.execute(
      `INSERT INTO da_sheets (id, name, type, status, template_id, notes, created_by)
       VALUES (:id, :name, :type, :status, :templateId, :notes, :createdBy)`,
      {
        id: sheetId,
        name: 'ERP System Evaluation Q1 2024',
        type: 'License',
        status: 'Draft',
        templateId: templates[0].id,
        notes: 'Initial evaluation for Q1 procurement',
        createdBy: adminId,
      }
    );

    await connection.commit();

    logger.info('Created sample DA sheet');
    logger.info('Database seeded successfully!');
    logger.info('');
    logger.info('Default accounts:');
    logger.info('  Admin: ADMIN001 / Admin@1234');
    logger.info('  User:  USER001  / User@1234');
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
    await closePool();
  }
}

seed().catch((err) => {
  logger.error({ error: err }, 'Seed failed');
  process.exit(1);
});
