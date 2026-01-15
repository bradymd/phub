const fs = require('fs');
const path = require('path');

// Education data from CV_JUNE_2016.odt
const educationRecords = [
  // Formal Education
  {
    id: Date.now().toString() + '0',
    qualification: 'M.Sc. (Hons) Computer Science',
    institution: 'University of Hertfordshire',
    year: '1985',
    grade: 'Honours',
    type: 'degree',
    notes: 'Master of Science in Computer Science with Honours'
  },
  {
    id: Date.now().toString() + '1',
    qualification: 'B.A. (Hons) Psychology',
    institution: 'University of Warwick',
    year: '1982',
    grade: '2(ii)',
    type: 'degree',
    notes: 'Bachelor of Arts in Psychology, Second Class Honours (Lower Division)'
  },
  {
    id: Date.now().toString() + '2',
    qualification: '4 A-Levels',
    institution: "St Aelred's Roman Catholic",
    year: '1979',
    grade: 'BBCC',
    type: 'a-level',
    notes: 'Four A-Level qualifications with grades B, B, C, C'
  },
  {
    id: Date.now().toString() + '3',
    qualification: '9 O-Levels',
    institution: "St Aelred's Roman Catholic",
    year: '1977',
    grade: '',
    type: 'o-level',
    notes: 'Nine O-Level qualifications'
  },

  // Professional Training & Certifications
  {
    id: Date.now().toString() + '10',
    qualification: 'SharePoint',
    institution: 'Professional Training',
    year: '2016',
    grade: '',
    type: 'training',
    notes: '1 week intensive SharePoint training course'
  },
  {
    id: Date.now().toString() + '11',
    qualification: 'Big IP F5',
    institution: 'F5 Networks',
    year: '2016',
    grade: '',
    type: 'training',
    notes: 'Web-based F5 load balancer training'
  },
  {
    id: Date.now().toString() + '12',
    qualification: 'Elasticsearch',
    institution: 'Professional Training',
    year: '2012',
    grade: '',
    type: 'training',
    notes: '1 week Elasticsearch training course'
  },
  {
    id: Date.now().toString() + '13',
    qualification: 'IBM AIX for Unix Professionals',
    institution: 'IBM',
    year: '2009',
    grade: '',
    type: 'training',
    notes: '5 days intensive AIX training course'
  },
  {
    id: Date.now().toString() + '14',
    qualification: 'Red Hat Deployment, Virtualization, and System Management',
    institution: 'Red Hat',
    year: '2007',
    grade: '',
    type: 'certification',
    notes: 'Official Red Hat training and certification'
  },
  {
    id: Date.now().toString() + '15',
    qualification: 'Gtech ES Gaming Software for Lotteries',
    institution: 'Gtech',
    year: '2007',
    grade: '',
    type: 'training',
    notes: 'Specialized training for lottery gaming software'
  },
  {
    id: Date.now().toString() + '16',
    qualification: 'Sun Certified Solaris Administrator (SCNA)',
    institution: 'Sun Microsystems',
    year: '2006',
    grade: 'Certified',
    type: 'certification',
    notes: 'Sun Certified Network Administrator for Solaris'
  },
  {
    id: Date.now().toString() + '17',
    qualification: 'Veritas Netbackup 5.1 Upgrade Course',
    institution: 'Veritas',
    year: '2004',
    grade: '',
    type: 'training',
    notes: 'Veritas Netbackup upgrade training'
  },
  {
    id: Date.now().toString() + '18',
    qualification: 'Sun Certified Network Administrator (SCNA - Solaris)',
    institution: 'Sun Microsystems',
    year: '2003',
    grade: 'Certified',
    type: 'certification',
    notes: 'Sun Certified Network Administrator for Solaris'
  },
  {
    id: Date.now().toString() + '19',
    qualification: 'Sun Certified Solaris Administrator (SCSA - Solaris 8)',
    institution: 'Sun Microsystems',
    year: '2002',
    grade: 'Certified',
    type: 'certification',
    notes: 'Sun Certified Solaris Administrator for Solaris 8'
  },
  {
    id: Date.now().toString() + '20',
    qualification: 'Veritas Netbackup for Enterprise',
    institution: 'Veritas',
    year: '2002',
    grade: '',
    type: 'training',
    notes: '3 days Veritas Netbackup Enterprise training'
  },
  {
    id: Date.now().toString() + '21',
    qualification: 'Oracle 8i DBA (Part I)',
    institution: 'Datatrain',
    year: '2001',
    grade: '',
    type: 'training',
    notes: '5 days Oracle Database Administrator training'
  },
  {
    id: Date.now().toString() + '22',
    qualification: 'Sun Cluster 3',
    institution: 'Sun Microsystems',
    year: '2001',
    grade: '',
    type: 'training',
    notes: '5 days Sun Cluster 3 training'
  },
  {
    id: Date.now().toString() + '23',
    qualification: 'Checkpoint Firewall-1',
    institution: 'Checkpoint',
    year: '2001',
    grade: '',
    type: 'training',
    notes: '2 days Checkpoint Firewall-1 training'
  },
  {
    id: Date.now().toString() + '24',
    qualification: 'Inktomi Caching',
    institution: 'Inktomi',
    year: '2001',
    grade: '',
    type: 'training',
    notes: '5 days Inktomi caching solution training'
  },
  {
    id: Date.now().toString() + '25',
    qualification: 'Veritas Volume Management',
    institution: 'Sun Microsystems',
    year: '2000',
    grade: '',
    type: 'training',
    notes: '5 day Sun course on Veritas Volume Management'
  },
  {
    id: Date.now().toString() + '26',
    qualification: 'Liberate Cable TV Software',
    institution: 'Liberate Technologies',
    year: '2000',
    grade: '',
    type: 'training',
    notes: 'Cable TV software platform training'
  },
  {
    id: Date.now().toString() + '27',
    qualification: 'Inktomi Caching',
    institution: 'Inktomi',
    year: '2000',
    grade: '',
    type: 'training',
    notes: '2 days Inktomi caching training'
  },
  {
    id: Date.now().toString() + '28',
    qualification: 'E10000 (E10K) Administration',
    institution: 'Sun Microsystems',
    year: '1999',
    grade: '',
    type: 'training',
    notes: '5 day Sun course on E10000 enterprise server administration'
  },
  {
    id: Date.now().toString() + '29',
    qualification: 'Security Dynamics ACE/Server (Tokens)',
    institution: 'Security Dynamics',
    year: '1999',
    grade: '',
    type: 'training',
    notes: 'Security token authentication system training'
  },
  {
    id: Date.now().toString() + '30',
    qualification: 'BP Project Management Course',
    institution: 'BP Oil International',
    year: '1999',
    grade: '',
    type: 'training',
    notes: '5 day project management training course'
  },
  {
    id: Date.now().toString() + '31',
    qualification: 'SVM (Veritas Volume Management) Sequent Course',
    institution: 'Sequent',
    year: '1998',
    grade: '',
    type: 'training',
    notes: '2 day SVM v2 training'
  },
  {
    id: Date.now().toString() + '32',
    qualification: 'Sun Microsystems Java',
    institution: 'Sun Microsystems',
    year: '1997',
    grade: '',
    type: 'training',
    notes: '5 day Java programming course for programmers'
  },
  {
    id: Date.now().toString() + '33',
    qualification: 'Windows 95, Word, Excel, Exchange',
    institution: 'BP Oil International',
    year: '1996',
    grade: '',
    type: 'training',
    notes: 'BP In-house Microsoft applications training'
  },
  {
    id: Date.now().toString() + '34',
    qualification: 'Sun Solaris 2.4 Administration',
    institution: 'Sun Microsystems',
    year: '1995',
    grade: '',
    type: 'training',
    notes: '4 day Solaris administration course'
  },
  {
    id: Date.now().toString() + '35',
    qualification: 'Sequent SVM 1 (Veritas Volume Management)',
    institution: 'Sequent',
    year: '1994',
    grade: '',
    type: 'training',
    notes: '3 day Veritas Volume Management training'
  },
  {
    id: Date.now().toString() + '36',
    qualification: 'Sequent System Administration DYNIX/ptx',
    institution: 'Sequent',
    year: '1993',
    grade: '',
    type: 'training',
    notes: '5 day Sequent DYNIX/ptx system administration'
  },
  {
    id: Date.now().toString() + '37',
    qualification: 'Hewlett Packard System Administration HP-UX',
    institution: 'Hewlett Packard',
    year: '1992',
    grade: '',
    type: 'training',
    notes: '5 day HP-UX system administration course'
  },
  {
    id: Date.now().toString() + '38',
    qualification: 'TCP/IP',
    institution: 'University of Manchester',
    year: '1990',
    grade: '',
    type: 'training',
    notes: '3 day TCP/IP networking course'
  },
  {
    id: Date.now().toString() + '39',
    qualification: 'Sun Microsystems SunOS',
    institution: 'Sun Microsystems',
    year: '1989',
    grade: '',
    type: 'training',
    notes: '5 day SunOS system administration'
  }
];

console.log(`Processing ${educationRecords.length} education records...`);

// Write to JSON file
const output = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  source: 'Extracted from CV_JUNE_2016.odt',
  entries: educationRecords
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'imported-education.json'),
  JSON.stringify(output, null, 2)
);

console.log(`✅ Successfully created ${educationRecords.length} education records`);
console.log(`📁 Saved to: public/imported-education.json`);

// Show summary
console.log('\n📊 Summary:');
const degrees = educationRecords.filter(r => r.type === 'degree').length;
const aLevels = educationRecords.filter(r => r.type === 'a-level').length;
const oLevels = educationRecords.filter(r => r.type === 'o-level').length;
const certifications = educationRecords.filter(r => r.type === 'certification').length;
const training = educationRecords.filter(r => r.type === 'training').length;

console.log(`  Degrees: ${degrees}`);
console.log(`  A-Levels: ${aLevels}`);
console.log(`  O-Levels: ${oLevels}`);
console.log(`  Certifications: ${certifications}`);
console.log(`  Training Courses: ${training}`);
console.log(`  Total: ${educationRecords.length}`);
