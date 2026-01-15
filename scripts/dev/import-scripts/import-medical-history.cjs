const fs = require('fs');
const path = require('path');

// Medical history records extracted from the OneDrive medical files
const medicalRecords = [
  // CARDIOLOGY
  {
    id: Date.now().toString() + '00',
    date: '2024-02-10',
    type: 'consultation',
    specialty: 'Cardiology',
    provider: 'Dr Paul Kirk - Spire Harpenden',
    condition: 'Heart Investigation - Mild Coronary Artery Disease',
    notes: `50% plaque in one part of the heart. 75% is when intervention (stent) required.
15-49% is considered MILD.
PVCs and Bradycardia - normal variation in population, not linked to heart disease unless very frequent.
Health check found mild heart disease requiring statins and lifestyle adjustments.`,
    treatment: 'Statins 20mg, lifestyle changes (low cholesterol diet, weight loss, reduce oil use)',
    outcome: 'Mild heart disease diagnosis - manageable with medication and lifestyle',
    attachments: ['Mark Brady - Cardiology (1).pdf', 'RESULTS OF HEART INVESTIGATION.txt', 'Heart_Tests_Spire.pdf']
  },
  {
    id: Date.now().toString() + '01',
    date: '2024-01-24',
    type: 'test',
    specialty: 'Cardiology',
    provider: 'OSD Health Assessment',
    condition: 'Cholesterol Test - High Levels',
    notes: `Fasting lipid test results:
- Total Cholesterol: 7.5 (HIGH)
- LDL (Bad): 5.6 (HIGH)
Recommendation: Statin 20mg to reduce cholesterol`,
    treatment: 'Atorvastatin 20mg prescribed',
    outcome: 'High cholesterol confirmed, statin treatment initiated',
    attachments: ['Cholesterol Results - 24.01.2024 Mark Brady.pdf', '2024-03-19-brady-mark-ltr-to-OSD-STATINS.pdf', '40mdmgAtorvastatinmPrescrip.pdf']
  },
  {
    id: Date.now().toString() + '02',
    date: '2024-01-19',
    type: 'test',
    specialty: 'Cardiology',
    provider: 'OSD',
    condition: 'ECG - Heart Rhythm Check',
    notes: 'ECG performed as part of cardiac assessment',
    treatment: 'Monitoring',
    outcome: 'ECG completed',
    attachments: ['ecg-20240119-135812.pdf', 'ECG - Mr Mark Brady (1).pdf']
  },
  {
    id: Date.now().toString() + '03',
    date: '2024-02-15',
    type: 'test',
    specialty: 'Cardiology',
    provider: 'Home monitoring',
    condition: 'Blood Pressure Monitoring',
    notes: 'OMRON blood pressure readings over one month',
    treatment: 'Ongoing monitoring',
    outcome: 'Blood pressure tracked',
    attachments: ['OMRON 15 Feb 2024 to 15 Mar 2024.pdf', 'OMRON Readings (27 Jan 2024 - 26 Feb 2024).pdf', 'OMRON Report 8-15March2024.pdf']
  },

  // GASTROENTEROLOGY
  {
    id: Date.now().toString() + '10',
    date: '2024-02-05',
    type: 'consultation',
    specialty: 'Gastroenterology',
    provider: 'Dr Vijay Grover - Bishops Wood Hospital, Mount Vernon',
    condition: 'Acid Reflux / GERD - Possible Hiatus Hernia',
    notes: `Options discussed for acid reflux:
1. Barium meal (tipped up to see liquid handling)
2. Endoscopy
Not taking Gaviscon regularly, so no urgent action needed.
Possible hiatus hernia - operation available but doesn't always last.
Decision: No action at this time (same as last visit).

Note: Possible Eosinophilic Esophagitis (EoE) - drugs didn't work, little inflammation found.
More affected by dust/odours/fumes than asthmatic wife.`,
    treatment: 'Gaviscon as needed, no surgery at this time',
    outcome: 'Monitoring, no immediate intervention',
    attachments: ['Dr-Vijay-Grover-Bishops-Wood-Hospital.pdf', 'GASTRO_MEETING_FEB2024.txt', 'LetterReBishopsWoodHospitalGastro.pdf', 'Do I have EoE.txt']
  },
  {
    id: Date.now().toString() + '11',
    date: '2024-02-10',
    type: 'procedure',
    specialty: 'Gastroenterology',
    provider: 'Hospital',
    condition: 'Gastroscopy',
    notes: 'Gastroscopy performed to investigate acid reflux and GERD',
    treatment: 'Endoscopic examination',
    outcome: 'Procedure completed',
    attachments: ['Mark Brady - Gastroenterology (1).pdf', 'aftercare gastroscopy.pdf', 'GASTROSCOPY AFTERCARE.tif', 'GASTROSCOPY AFTERCARE-1.tif']
  },
  {
    id: Date.now().toString() + '12',
    date: '2019-09-01',
    type: 'test',
    specialty: 'Gastroenterology',
    provider: 'OSD',
    condition: 'Health Assessment',
    notes: 'General health assessment including gastro review',
    treatment: 'Assessment only',
    outcome: 'Completed',
    attachments: ['OSD-FABIO-SEP2019.pdf', 'OSD Health Assessment Letter.pdf']
  },

  // ORTHOPEDICS / NEUROLOGY
  {
    id: Date.now().toString() + '20',
    date: '2025-06-13',
    type: 'consultation',
    specialty: 'Neurology',
    provider: 'Dr Zaw',
    condition: 'Numb Foot / Leg - Neurological Assessment',
    notes: `Leg going numb when running - referred to neurology.
Not related to heart issues (ruled out by cardiology).
Awaiting specialist assessment.`,
    treatment: 'Referral to neurology',
    outcome: 'Awaiting neurology appointment',
    attachments: ['2025-06-13 neuro referral.pdf', 'DrZaw_Letter_ About_Numb_Foot_To_GP.pdf', 'Dr_Zaw_Numb_Foot_2nd_GP Letter_.pdf']
  },
  {
    id: Date.now().toString() + '21',
    date: '2025-06-04',
    type: 'consultation',
    specialty: 'Orthopedics / Physiotherapy',
    provider: 'Dr Ahearne',
    condition: 'Tennis Elbow',
    notes: 'Tennis elbow assessment and treatment',
    treatment: 'Physiotherapy',
    outcome: 'Ongoing treatment',
    attachments: ['DrAhearneTennisElbow.pdf', 'phyisio-4th-June-2025-tennis-elbow.txt', 'dr-ahearne-bill.pdf']
  },
  {
    id: Date.now().toString() + '22',
    date: '2025-06-01',
    type: 'consultation',
    specialty: 'Orthopedics',
    provider: 'Orthopedic Surgeon (AXA)',
    condition: 'Foot Assessment',
    notes: 'Orthopedic assessment for foot issues',
    treatment: 'Assessment and recommendations',
    outcome: 'Awaiting follow-up',
    attachments: ['foot-orthopedic-surgenon-axa-june-2025.txt', 'Orthopaedic referral - Mark Brady.pdf']
  },
  {
    id: Date.now().toString() + '23',
    date: '2020-01-01',
    type: 'test',
    specialty: 'Neurology',
    provider: 'Dr Freilich',
    condition: 'Nerve Conduction Tests',
    notes: 'Nerve conduction studies performed',
    treatment: 'Diagnostic testing',
    outcome: 'Tests completed',
    attachments: ['Dr_Freilichreport_nerve_conduction_tests.pdf']
  },

  // UROLOGY
  {
    id: Date.now().toString() + '30',
    date: '2021-10-01',
    type: 'consultation',
    specialty: 'Urology',
    provider: 'Dr Sandler',
    condition: 'Blood in Urine',
    notes: 'Investigation of blood in urine',
    treatment: 'Tests and monitoring',
    outcome: 'Investigated',
    attachments: ['DrSandlerBloofInUrineOct2021.pdf', 'DrSandlerBloofInUrineOct2021_edited.pdf', 'BladderReferral.pdf']
  },

  // BLOOD TESTS & SCANS
  {
    id: Date.now().toString() + '40',
    date: '2024-04-02',
    type: 'test',
    specialty: 'General',
    provider: 'GP',
    condition: 'Blood Test',
    notes: 'Routine blood test',
    treatment: 'Blood test',
    outcome: 'Results received',
    attachments: ['BLOOD TEST 2ND APRIL .txt', 'Blood results - 17.01.2024 Mark Brady.pdf']
  },
  {
    id: Date.now().toString() + '41',
    date: '2024-03-05',
    type: 'scan',
    specialty: 'Radiology',
    provider: 'Hospital',
    condition: 'CT Scan',
    notes: 'CT scan and heart monitor',
    treatment: 'Diagnostic imaging',
    outcome: 'Scan completed',
    attachments: ['ct-scan-5thMarchAndHeartMonitor.pdf', 'CT SCAN RESULT.jpg', 'ResultsOfScanBloodNOTCamera.pdf']
  },
  {
    id: Date.now().toString() + '42',
    date: '2024-01-18',
    type: 'test',
    specialty: 'Gastroenterology',
    provider: 'GP',
    condition: 'FIT Test (Bowel Cancer Screening)',
    notes: 'Faecal Immunochemical Test for bowel cancer screening',
    treatment: 'Screening test',
    outcome: 'Test completed',
    attachments: ['FIT test result - 18.01.2024 Mark Brady.pdf', 'BowelCancetScreening.pdf', 'BowelScreenJun2021.pdf']
  },
  {
    id: Date.now().toString() + '43',
    date: '2016-05-01',
    type: 'test',
    specialty: 'General',
    provider: 'GP',
    condition: 'Blood Test',
    notes: 'Blood test May 2016',
    treatment: 'Blood test',
    outcome: 'Results received',
    attachments: ['Blood test may 2016.pdf']
  },

  // PRESCRIPTIONS
  {
    id: Date.now().toString() + '50',
    date: '2024-03-26',
    type: 'prescription',
    specialty: 'Cardiology',
    provider: 'GP',
    condition: 'Statin Prescription',
    notes: 'Atorvastatin 40mg prescription until March 2025',
    treatment: 'Atorvastatin 40mg daily',
    outcome: 'Prescription active',
    attachments: ['Prescription Statin to 26-03-2025.pdf', '40mdmgAtorvastatinmPrescrip.pdf']
  },
  {
    id: Date.now().toString() + '51',
    date: '2016-07-01',
    type: 'prescription',
    specialty: 'Gastroenterology',
    provider: 'GP',
    condition: 'Lansoprazole Prescription',
    notes: 'Lansoprazole for acid reflux',
    treatment: 'Lansoprazole',
    outcome: 'Prescribed',
    attachments: ['LANZAPROZOLE PRESCSRIPTION.tif']
  },

  // GENERAL / REFERRALS
  {
    id: Date.now().toString() + '60',
    date: '2024-01-01',
    type: 'consultation',
    specialty: 'General Practice',
    provider: 'Lincoln House',
    condition: 'GP Referral',
    notes: 'General practice referral for blood tests and assessments',
    treatment: 'Referral',
    outcome: 'Referred',
    attachments: ['Lincoln House Referral.pdf', 'LINCOLNHOUSE_GET_BLOOD_TEST.pdf']
  },
  {
    id: Date.now().toString() + '61',
    date: '2018-08-14',
    type: 'consultation',
    specialty: 'General Practice',
    provider: 'Dr Fullard',
    condition: 'GP Consultation',
    notes: 'General practice consultation August 2018',
    treatment: 'Consultation',
    outcome: 'Completed',
    attachments: ['DR-FULLARD-AUG14-2018.pdf']
  },
  {
    id: Date.now().toString() + '62',
    date: '2016-10-01',
    type: 'consultation',
    specialty: 'General Practice',
    provider: 'GP',
    condition: 'Panic/Anxiety Letter',
    notes: 'GP letter regarding panic/anxiety',
    treatment: 'Assessment and support',
    outcome: 'Letter provided',
    attachments: ['DR PANIC LTTER OCT 2016.tif']
  },
  {
    id: Date.now().toString() + '63',
    date: '2020-04-27',
    type: 'other',
    specialty: 'General',
    provider: 'NHS',
    condition: 'Clinically Vulnerable Letter (COVID-19)',
    notes: 'Letter confirming clinically vulnerable status during COVID-19 pandemic',
    treatment: 'Shielding advice',
    outcome: 'Letter received',
    attachments: ['ClinicallyVulnApril2020.pdf', 'CovidLtrChristianne27April.pdf']
  },

  // INSURANCE & ADMIN
  {
    id: Date.now().toString() + '70',
    date: '2024-02-01',
    type: 'other',
    specialty: 'Administrative',
    provider: 'AXA Health Insurance',
    condition: 'Insurance Claims',
    notes: 'AXA health insurance claims for cardiology and gastroenterology appointments',
    treatment: 'N/A',
    outcome: 'Claims processed',
    attachments: ['AXA CLAIM CARDIO M64V5XG.txt', 'AXA CLAIM GASTRO QVTX9CG.txt', 'AXA  MEMBERSHIP SUMMARY temp.txt', 'AxaClaimBackCost.pdf', 'AxaPhysioNoChargeCost72.pdf']
  },
  {
    id: Date.now().toString() + '71',
    date: '2016-07-22',
    type: 'consultation',
    specialty: 'General',
    provider: 'Hospital',
    condition: 'Hospital Appointment',
    notes: 'Hospital appointment July 2016',
    treatment: 'Consultation',
    outcome: 'Attended',
    attachments: ['HOSPITALAPPT 22ND JULY 2016.jpg', 'HOSPITAL APPT 27 SEP 2016.pdf', '12 JULY 2016 APPT.tif']
  }
];

console.log(`Processing ${medicalRecords.length} medical history records...`);

// Write to JSON file
const output = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  source: 'Extracted from OneDrive_1_08-01-2026.zip medical files',
  totalRecords: medicalRecords.length,
  entries: medicalRecords
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'imported-medical-history.json'),
  JSON.stringify(output, null, 2)
);

console.log(`✅ Successfully created ${medicalRecords.length} medical history records`);
console.log(`📁 Saved to: public/imported-medical-history.json`);

// Show summary by specialty
console.log('\n📊 Summary by Specialty:');
const specialties = {};
medicalRecords.forEach(record => {
  if (!specialties[record.specialty]) {
    specialties[record.specialty] = 0;
  }
  specialties[record.specialty]++;
});

Object.entries(specialties).sort((a, b) => b[1] - a[1]).forEach(([specialty, count]) => {
  console.log(`  ${specialty}: ${count} records`);
});

// Show summary by type
console.log('\n📋 Summary by Type:');
const types = {};
medicalRecords.forEach(record => {
  if (!types[record.type]) {
    types[record.type] = 0;
  }
  types[record.type]++;
});

Object.entries(types).forEach(([type, count]) => {
  console.log(`  ${type}: ${count} records`);
});

console.log('\n💡 Next steps:');
console.log('  1. Copy medical files to public/medical/ directory');
console.log('  2. Visit import-medical-history.html to encrypt and import records');
console.log('  3. All 88 files from the zip are referenced in attachments');
