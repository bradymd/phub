const fs = require('fs');
const path = require('path');

// Manually parsed employment data from CV
const employmentRecords = [
  {
    id: Date.now().toString() + '0',
    company: 'University of Hertfordshire',
    jobTitle: 'Systems Consultant',
    startDate: '2012-02-01',
    endDate: '',
    current: true,
    location: 'Hertfordshire',
    employmentType: 'full-time',
    responsibilities: `• Manage 160+ Rocky Linux (8/9) servers built via Kickstart to a defined standard
• Provide Nagios monitoring platform which feeds into a centralized dashboard
• Use Qualys for vulnerability scanning; enforce patching, firewalls, and hardened configurations
• Manage outgoing SMTP services and lead DMARC compliance implementation
• Maintain a mix of virtual and physical servers and appliances
• Administer two F5 clusters supporting ~200 services
• Developed Django app to monitor, alert, and manage TLS certificates and Qualys grading
• Support range of platforms including Ruby on Rails, WordPress, Tomcat, Apache, and Nginx
• Build Django/Flask tools for certificate management, Shodan IP tracking, and internal support
• Maintain Jenkins, gitlab, GitLab CI pipelines; extensive use of Ansible and Puppet for configuration
• Manage Puppet across 120 servers; maintain wide portfolio of Ansible playbooks
• Operate within an ITIL-based change management framework
• Limited Docker exposure; small-scale AWS presence and cloud service integration`,
    achievements: `• Developed custom Django/Flask applications for certificate management and security monitoring
• Implemented comprehensive monitoring and automation across 160+ servers
• Led DMARC compliance implementation for mail infrastructure
• Maintained high availability F5 load balancing infrastructure supporting 200+ services`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '1',
    company: 'National Lottery',
    jobTitle: 'UNIX Systems Engineer',
    startDate: '2007-04-01',
    endDate: '2012-02-01',
    current: false,
    location: 'Watford',
    employmentType: 'full-time',
    responsibilities: `• Worked in team of four operating 280 Redhat and AIX Servers
• Managed 3-tier website architecture with load balanced Linux servers
• Administered virtualised elements using Jboss, Java and Apache
• Managed backend Clustered AIX database servers (HACMP and PowerVM)
• Operated within highly rigorous ITIL-based methods of working`,
    achievements: `• Successfully managed critical infrastructure for National Lottery systems
• Maintained high availability environment with strict ITIL compliance
• Supported mission-critical financial systems with 24/7 availability requirements`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '2',
    company: 'Various (BP Oil, NTL, Tiscali, UK Universities)',
    jobTitle: 'UNIX Systems Engineer / Computer Officer',
    startDate: '1986-01-01',
    endDate: '2007-04-01',
    current: false,
    location: 'Various UK locations',
    employmentType: 'full-time',
    responsibilities: `• Managed enterprise-scale Sequent and Sun systems
• Led disaster recovery planning initiatives
• Supported academic computing environments
• Administered large-scale UNIX infrastructure across multiple organizations`,
    achievements: `• Led BP's Y2K readiness program
• Contributed to world's first digital cable TV rollout at NTL
• Gained extensive experience across telecommunications, oil & gas, and higher education sectors
• Developed expertise in enterprise UNIX systems management`,
    salary: '',
    pensionScheme: ''
  }
];

console.log(`Processing ${employmentRecords.length} employment records...`);

// Write to JSON file
const output = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  entries: employmentRecords
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'imported-employment.json'),
  JSON.stringify(output, null, 2)
);

console.log(`✅ Successfully created ${employmentRecords.length} employment records`);
console.log(`📁 Saved to: public/imported-employment.json`);

// Show summary
console.log('\n📊 Summary:');
employmentRecords.forEach((record, index) => {
  const duration = record.current ?
    `${record.startDate} - Present` :
    `${record.startDate} - ${record.endDate}`;
  console.log(`  ${index + 1}. ${record.jobTitle} at ${record.company} (${duration})`);
});
