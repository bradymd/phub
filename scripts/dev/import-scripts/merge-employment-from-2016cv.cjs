const fs = require('fs');
const path = require('path');

// Read existing employment data
const existingData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public', 'imported-employment.json'), 'utf8')
);

// Enhanced employment records from 2016 CV with more detail
const enhancedRecords = [
  {
    id: existingData.entries[0].id, // Keep existing ID for University of Hertfordshire
    company: 'University of Hertfordshire',
    jobTitle: 'Systems Consultant',
    startDate: '2012-02-01',
    endDate: '',
    current: true,
    location: 'Hertfordshire',
    employmentType: 'full-time',
    responsibilities: `• Kickstart Centos Servers – about 160+ virtual machines for University Administration
• Install and update application layer: Coldfusion and Apache, or Ruby on Rails with Nginx
• Operate Jenkins for automation jobs, GitLab CI for continuous integration
• Extensively monitor systems with Nagios feeding into centralized dashboard
• Manage LDAP environment with widespread Open Source and bought packages
• Run services on CentOS/Rocky Linux, SuSE Linux and Ubuntu
• Operate F5 load balancer - load balance key services across two data centres
• Constantly install and document new services
• Developed Django/Flask applications for certificate management and security monitoring
• Manage Puppet across 120+ servers, maintain wide portfolio of Ansible playbooks
• Work with agile methods, daily scrums, continuous integration tools
• Use Qualys for vulnerability scanning; enforce patching, firewalls, hardened configurations
• Manage outgoing SMTP services and lead DMARC compliance implementation
• Support platforms: Ruby on Rails, WordPress, Tomcat, Apache, Nginx
• Build Django/Flask tools for certificate management, Shodan IP tracking, internal support
• Maintain Jenkins, gitlab, GitLab CI pipelines
• Operate within ITIL-based change management framework
• Limited Docker exposure; small-scale AWS presence and cloud service integration`,
    achievements: `• Developed custom Django/Flask applications for certificate management and security monitoring
• Implemented comprehensive monitoring and automation across 160+ servers
• Led DMARC compliance implementation for mail infrastructure
• Maintained high availability F5 load balancing infrastructure supporting 200+ services
• Successfully integrated modern DevOps practices into traditional IT operations`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: existingData.entries[1].id, // Keep existing ID for National Lottery
    company: 'Camelot National Lottery',
    jobTitle: 'Senior UNIX Systems Engineer',
    startDate: '2007-04-01',
    endDate: '2012-02-01',
    current: false,
    location: 'Watford',
    employmentType: 'full-time',
    responsibilities: `• Worked in team of four operating 280 Redhat and AIX Servers
• Managed 3-tier website architecture with load balanced Linux servers
• Administered virtualised elements using Jboss, Java and Apache
• Managed backend Clustered AIX database servers (HACMP and PowerVM)
• Operated systems spanning two data centres
• Go-to expert for Email, Red Hat Linux and Kickstart
• Day-to-day support: patching and firmware updates
• Resolved problems effectively and efficiently, prioritising issues
• Completed work requests on daily basis
• Managed virtual and physical machines using SAN and RAID disks
• Extensive use of Logical Volume Management
• Strong scripting skills (korn, bash, sed, awk)
• Deep understanding of TCP/IP and internet protocols
• Expert knowledge of Kickstart and RHN Satellite product
• Operated within highly rigorous ITIL-based methods of working`,
    achievements: `• Successfully managed critical infrastructure for National Lottery systems
• Maintained high availability environment with strict ITIL compliance
• Supported mission-critical financial systems with 24/7 availability requirements
• Became team's specialist for Email, Red Hat Linux and Kickstart technologies
• Managed complex multi-datacenter architecture supporting millions of transactions`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '2',
    company: 'Tiscali UK',
    jobTitle: 'UNIX Systems Engineer',
    startDate: '2002-07-01',
    endDate: '2007-05-01',
    current: false,
    location: 'Milton Keynes',
    employmentType: 'full-time',
    responsibilities: `• Responsible for running 150+ systems within European ISP infrastructure
• Managed Portal services (Apache), NAS systems (Netapps)
• Administered Mail services (Exim, sendmail, Critical Path)
• Maintained Siebel CRM platform
• Managed ISP Billing system (Digiquant IMS)
• Supported Mobile services (WAP) and Service Provisioning with JAVA
• Administered RADIUS authentication services
• Managed J2EE Java enterprise services and Jakarta Tomcat
• Specialist in Veritas Netbackup 4.5/5.1 using L700 robot in firewall environment
• Worked with Solaris 2.7/2.8/2.9 and FreeBSD 4.5 to 6.1
• Managed Veritas Volume Manager and Solstice Disksuite
• Administered Sun Cluster 2.2 and 3.1
• Extensive Apache and Jakarta Tomcat experience
• Oracle Server administration
• Shell scripting (bourne), awk and Perl
• Jumpstart and DNS administration
• Managed Sun Storage: RAID5, D1000, 6920, A5000, A3500, 3310
• Hardware: E420R, E280R, Netra t1, E450, E250, E4500, VX1280, V440, V480, Ultra 5/10`,
    achievements: `• Successfully managed infrastructure for major European ISP during consolidation period
• Became specialist in Veritas Netbackup in complex firewall environments
• Supported diverse range of critical services from email to billing systems
• Maintained high availability for ISP serving millions of customers
• Gained extensive experience across multiple Unix platforms and enterprise applications`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '3',
    company: 'NTL (Cable and Wireless)',
    jobTitle: 'UNIX Systems Engineer',
    startDate: '2000-01-01',
    endDate: '2002-07-01',
    current: false,
    location: 'Watford',
    employmentType: 'full-time',
    responsibilities: `• Development and Architecture team (4th line support) for world's first Digital Cable TV service
• Directly responsible for operation and maintenance of 80 Solaris systems
• Involved with roll-out and 4th line support of production machines
• DigitalTV performance and capacity planning
• Advanced trouble-shooting and problem resolution
• Specialised in caching solutions (Inktomi)
• Defined standards for building and operation of machines
• Wrote support utilities and automation tools
• Solaris 2.6, 2.7, 2.8 administration
• Veritas and Solstice Disksuite management
• Legato backup software
• Scripting and automation
• Netscape Enterprise Server management
• Jumpstart deployment
• DNS administration
• Intranet site development
• Apache web server administration
• Hardware: E420R, E280R, Netra t1, E450, E250, E4500, D1000, Ultra 5/10`,
    achievements: `• Contributed to world's first digital cable TV rollout
• Provided 4th line support for cutting-edge digital TV platform
• Led performance and capacity planning for DigitalTV services
• Became specialist in Inktomi caching solutions
• Established standards for machine builds and operations
• Supported revolutionary convergence of cable TV and internet services`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '4',
    company: 'BP Oil International',
    jobTitle: 'UNIX Systems Engineer',
    startDate: '1996-01-01',
    endDate: '1999-12-01',
    current: false,
    location: 'Various UK locations',
    employmentType: 'full-time',
    responsibilities: `• Member of team of 12 managing 50 Sequents (DYNIX/ptx) and 300+ Suns (Solaris)
• Maintained retail systems in 23 countries with 8 System Administrators
• Technical lead for BP's Disaster Recovery Solution (EU) and test scenarios
• Technical lead for selection of worldwide backup solution
• Owned BP Oil's response to Y2K system challenge
• Project Managed roll-out of Solaris upgrade (20+ countries)
• Chief technical input on 2 worldwide upgrades of Sequent machines
• Performed operating system upgrades and planned them for the team
• Planned and performed data migrations
• Worked with teams for testing (Y2K and upgrades) and acceptance testing
• 24x7 on-call rota and front-line support duties of critical systems
• Wrote and maintained wide range of support utilities
• Solaris 2.6, 2.7 administration
• Solstice Disksuite and Veritas Volume Management
• DYNIX/ptx 4.4.x and 2.x
• DNS, Apache, Bourne shell, Awk
• BokS Security, SecurID
• AutoTransfer software distribution
• Legato Networker
• Hardware: E10000, E4500, E450, Ultra's, A5000 arrays, D1000, SPARCstorage arrays`,
    achievements: `• Led BP's Y2K readiness program - critical success
• Technical lead for EU Disaster Recovery solution
• Successfully managed Solaris upgrade across 20+ countries
• Provided technical leadership on worldwide Sequent machine upgrades
• Maintained critical retail systems across 23 countries
• Gained extensive enterprise-scale Unix systems management experience
• Successful delivery of worldwide backup solution selection and implementation`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '5',
    company: 'Royal Holloway, University of London',
    jobTitle: 'Computer Officer',
    startDate: '1992-05-01',
    endDate: '1995-12-01',
    current: false,
    location: 'Egham, Surrey',
    employmentType: 'full-time',
    responsibilities: `• Worked for University Computer Centre providing central support to Administration and Campus
• Established University's Internet presence including their Art Collection website
• Provided new UNIX facilities – Sequent, Suns, HP systems
• Management of maintenance contracts
• Implementation of new Administration systems (Sequent and Sun)
• Usenet News administration
• WWW (World Wide Web) services
• PCNFS and NFS services
• Printing services
• X terminals support
• Programmer support`,
    achievements: `• Established Royal Holloway's first Internet presence
• Created online presence for their renowned Art Collection
• Successfully deployed new UNIX infrastructure for University Administration
• Provided critical support during early Internet adoption period
• Supported diverse academic and administrative computing needs`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '6',
    company: 'University of Manchester (UMIST)',
    jobTitle: 'Computer Officer',
    startDate: '1987-05-01',
    endDate: '1992-05-01',
    current: false,
    location: 'Manchester',
    employmentType: 'full-time',
    responsibilities: `• Varied role supporting Department of Computation Research groups
• Managed 30+ UNIX systems (mainly SunOS and BSD)
• Provided research computing support
• System administration across diverse Unix platforms
• User support for academic researchers
• Maintained research computing infrastructure`,
    achievements: `• Successfully supported multiple research groups with diverse computing needs
• Gained extensive experience with SunOS and BSD Unix systems
• Provided critical infrastructure for academic research projects
• Developed broad Unix administration skills across 30+ systems
• Started career in higher education computing`,
    salary: '',
    pensionScheme: ''
  },
  {
    id: Date.now().toString() + '7',
    company: 'Vantona Vyella PLC',
    jobTitle: 'Computer Programmer',
    startDate: '1986-01-01',
    endDate: '1987-05-01',
    current: false,
    location: 'Bolton',
    employmentType: 'full-time',
    responsibilities: `• Operating a large data processing system
• Writing BASIC programmes for business applications
• Supporting corporate IT operations`,
    achievements: `• First professional IT position
• Gained experience in business data processing
• Developed programming skills in production environment`,
    salary: '',
    pensionScheme: ''
  }
];

console.log(`Merging employment records from 2016 CV...`);
console.log(`Found ${enhancedRecords.length} employment records with enhanced detail`);

// Write to JSON file
const output = {
  version: '2.0',
  exportDate: new Date().toISOString(),
  source: 'Merged from CV_JUNE_2025.docx and CV_JUNE_2016.odt',
  entries: enhancedRecords
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'imported-employment.json'),
  JSON.stringify(output, null, 2)
);

console.log(`✅ Successfully merged ${enhancedRecords.length} employment records`);
console.log(`📁 Updated: public/imported-employment.json`);

// Show summary
console.log('\n📊 Enhanced Employment History:');
enhancedRecords.forEach((record, index) => {
  const duration = record.current ?
    `${record.startDate} - Present` :
    `${record.startDate} - ${record.endDate}`;
  console.log(`  ${index + 1}. ${record.jobTitle} at ${record.company} (${duration})`);
});

console.log('\n💡 Next step: Visit http://localhost:5173/import-employment.html to re-import the enhanced data');
