import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL || 'postgresql://lms_migrator:lms_migrator_password@localhost:5432/lms_dev?schema=public',
    },
  },
});

interface RuleSeed {
  statuteCode: string;
  statuteName: string;
  ruleNumber: string;
  title: string;
  category: string;
  content: string;
  courtType?: string;
  notes?: string;
  keyTopics: string[];
  crossReferences: string[];
}

const PPC_AND_STATUTORY_PROVISIONS: RuleSeed[] = [
  // PAKISTAN PENAL CODE, 1860 (ACT XLV OF 1860) - OFFENCES AGAINST THE HUMAN BODY
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 300',
    title: 'Qatl-i-Amd (Definition of Intentional Murder)',
    category: 'Criminal Law - Homicide',
    content: 'Whoever, with the intention of causing death or with the intention of causing bodily injury to a person, by doing an act which in the ordinary course of nature is likely to cause death, or with the knowledge that his act is so imminently dangerous that it must in all probability cause death, causes the death of such person, commits qatl-i-amd.',
    courtType: 'Court of Sessions',
    notes: 'The foundational definition of intentional murder in Pakistani criminal law. Requires proof of mens rea (intention or knowledge) and actus reus resulting in death. Contrast with Qatl-i-Shibh-i-Amd (Section 315) and Qatl-i-Khata (Section 318).',
    keyTopics: ['Qatl-i-Amd', 'Section 300 PPC', 'Intentional Murder', 'Mens Rea', 'Actus Reus', 'Homicide'],
    crossReferences: ['Section 302 PPC', 'Section 304 PPC', 'Section 306 PPC', 'Article 9 Constitution']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 302',
    title: 'Punishment of Qatl-i-Amd (Colloquially referred to as Article 302)',
    category: 'Criminal Law - Homicide & Capital Sentences',
    content: 'Whoever commits qatl-i-amd shall, subject to the provisions of this Chapter be: (a) punished with death as qisas; (b) punished with death, or imprisonment for life as ta\'zir, having regard to the facts and circumstances of the case, if the proof in either of the forms specified in section 304 is not available; or (c) punished with imprisonment of either description for a term which may extend to twenty-five years, where according to the Injunctions of Islam the punishment of qisas is not applicable: Provided that nothing in clause (c) shall apply to the offence of qatl-i-amd committed in the name or on the pretext of honour, in which case the punishment shall be imprisonment for life or death.',
    courtType: 'Court of Sessions / High Court (Confirmation)',
    notes: 'NOTE ON TERMINOLOGY: Often colloquially called "Article 302" by the public, but legally codified as Section 302 of the Pakistan Penal Code, 1860. The 1973 Constitution has 280 Articles, not 302. In practice, >95% of convictions are awarded under Section 302(b) (Ta\'zir). Death sentences require mandatory confirmation by a High Court Division Bench under Section 374 CrPC. Honour killings strictly bar clause (c) leniency under the 2016 Amendment (Act XLIII of 2016).',
    keyTopics: ['Section 302 PPC', 'Article 302', 'Qatl-i-Amd', 'Qisas', 'Ta\'zir', 'Honour Killing', 'Capital Punishment', 'Life Imprisonment'],
    crossReferences: ['Section 300 PPC', 'Section 304 PPC', 'Section 309 PPC', 'Section 310 PPC', 'Section 311 PPC', 'CrPC Section 374', 'Constitution Article 185(3)']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 304',
    title: 'Proof of Qatl-i-Amd Liable to Qisas',
    category: 'Criminal Law - Evidence for Qisas',
    content: '(1) Proof of qatl-i-amd liable to qisas shall be in one of the following forms, namely: (a) the accused makes before a Court competent to hear and decide the charge a voluntary and true confession of the commission of the offence; or (b) by the evidence as provided in Article 17 of the Qanun-e-Shahadat, 1984 (two sane, adult Muslim male eyewitnesses who are truthful and abstain from major sins - Tazkiya-al-Shuhood).',
    courtType: 'Court of Sessions',
    notes: 'The strict religious evidentiary standard for Qisas. If a confession is retracted or eyewitnesses do not pass Tazkiya-al-Shuhood, Qisas is barred and sentencing shifts to Section 302(b) Ta\'zir (Hashim Qasim v. State, 2017 SCMR 986).',
    keyTopics: ['Section 304 PPC', 'Proof of Qisas', 'Tazkiya-al-Shuhood', 'Judicial Confession', 'Article 17 QSO'],
    crossReferences: ['Section 302(a) PPC', 'QSO Article 17', 'QSO Article 37-43']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 306',
    title: 'Qatl-i-Amd Not Liable to Qisas',
    category: 'Criminal Law - Exceptions to Qisas',
    content: 'Qatl-i-amd shall not be liable to qisas in the following cases, namely: (a) when an offender is a minor or an insane person; (b) when an offender causes the death of his child or grandchild, how low-so-ever; and (c) when any wali of the victim is a direct descendant, how low-so-ever, of the offender.',
    courtType: 'Court of Sessions',
    notes: 'Exempts specific categories from capital retribution (Qisas). In such circumstances, the offender is tried and sentenced under Section 302(c) or Section 308 for Ta\'zir and Diyat.',
    keyTopics: ['Section 306 PPC', 'Exceptions to Qisas', 'Minority Defense', 'Insanity', 'Parental Exemption'],
    crossReferences: ['Section 302(c) PPC', 'Section 308 PPC']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 309',
    title: 'Waiver (Afw) of Qisas in Qatl-i-Amd',
    category: 'Criminal Law - Pardon & Compromise',
    content: '(1) In the case of qatl-i-amd, an adult sane wali may, at any time on payment of diyat or without any compensation, waive the right of qisas: Provided that the right of qisas shall not be waived: (a) where the Government is the wali; or (b) where the right of qisas vests in a minor or insane person.',
    courtType: 'Court of Sessions / Appellate Courts',
    notes: 'Governs unilateral pardon without compensation. Must be consented to by all adult legal heirs (wali). Subject to judicial oversight under Section 311 PPC regarding Fasad-fil-Arz.',
    keyTopics: ['Section 309 PPC', 'Afw', 'Waiver of Qisas', 'Wali', 'Pardon'],
    crossReferences: ['Section 310 PPC', 'Section 311 PPC', 'CrPC Section 345']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 310',
    title: 'Compounding (Sulh) of Qisas in Qatl-i-Amd',
    category: 'Criminal Law - Diyat & Settlement',
    content: '(1) In the case of qatl-i-amd, an adult sane wali may, at any time on accepting badal-i-sulh (diyat or monetary consideration), compound the right of qisas. Badal-i-sulh may be in cash, movable or immovable property, not less than the value of Diyat fixed by the Federal Government annually under Section 323.',
    courtType: 'Court of Sessions / Appellate Courts',
    notes: 'Settlement via blood money (Diyat). Minimum Diyat is pegged to 30,630 grams of silver. Court must verify genuine consent and absence of coercion before accepting compromise.',
    keyTopics: ['Section 310 PPC', 'Sulh', 'Compounding of Murder', 'Badal-i-Sulh', 'Diyat'],
    crossReferences: ['Section 309 PPC', 'Section 311 PPC', 'Section 323 PPC', 'CrPC Section 345']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 311',
    title: 'Ta\'zir After Waiver or Compounding of Qisas (Fasad-fil-Arz)',
    category: 'Criminal Law - Judicial Discretion & Anti-Honour Killing',
    content: 'Where all the walis do not waive or compound the right of qisas, or keeping in view the principle of fasad-fil-arz, the court may, in its discretion, having regard to the facts and circumstances of the case, punish an offender against whom the right of qisas has been waived or compounded with death or imprisonment for life or imprisonment of either description for a term which may extend to fourteen years: Provided that if the offence has been committed in the name or on the pretext of honour, the imprisonment shall not be less than imprisonment for life.',
    courtType: 'Court of Sessions / High Court',
    notes: 'The State\'s constitutional backstop preventing wealthy or influential murderers and honour killers from escaping justice through coerced family compromises. Amended in 2016 to mandate minimum life imprisonment in honour killings.',
    keyTopics: ['Section 311 PPC', 'Fasad-fil-Arz', 'Anti-Honour Killing Act 2016', 'Non-Compoundable Discretion', 'Mischief on Earth'],
    crossReferences: ['Section 302 PPC Proviso', 'Section 309 PPC', 'Section 310 PPC']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 324',
    title: 'Attempt to Commit Qatl-i-Amd (Attempted Murder)',
    category: 'Criminal Law - Inchoate Offences',
    content: 'Whoever does any act with such intention or knowledge, and under such circumstances, that, if he by that act caused death, he would be guilty of qatl-i-amd, shall be punished with imprisonment of either description for a term which may extend to ten years, and shall also be liable to fine, and, if hurt is caused to any person by such act, the offender shall also be liable to the punishment provided for the hurt caused: Provided that where the offence is committed under the pretext of honour, punishment shall extend to fourteen years.',
    courtType: 'Court of Sessions / Magistrate Section 30',
    notes: 'Governs firearm assaults, violent ambushes, and assassination attempts where the victim survives. Hurt caused attracts additional consecutive penalties under Section 337.',
    keyTopics: ['Section 324 PPC', 'Attempt to Murder', 'Assault with Weapon', 'Firearm Shooting'],
    crossReferences: ['Section 300 PPC', 'Section 337 PPC', 'CrPC Section 497']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 337',
    title: 'Shajjah and Jaifah (Offences Causing Bodily Hurt)',
    category: 'Criminal Law - Hurt & Bodily Injury',
    content: 'Categorizes physical injuries into Shajjah (hurts on head or face: Khafifah, Mudihah, Hashimah, Munaqqilah, Ammah, Damighah) and Jaifah (hurts on body trunk opening into cavity) carrying specific penalties of Qisas, Arsh, Daman, and imprisonment.',
    courtType: 'Magistrate / Sessions Court',
    notes: 'Governs medico-legal certificates (MLCs) and medical examination evidence in violent criminal assaults.',
    keyTopics: ['Section 337 PPC', 'Hurt', 'Shajjah', 'Jaifah', 'Arsh', 'Daman', 'Medico-Legal Certificate'],
    crossReferences: ['Section 324 PPC', 'Section 332 PPC']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 376',
    title: 'Punishment for Rape (Zina-bil-Jabr)',
    category: 'Criminal Law - Sexual Violence',
    content: '(1) Whoever commits rape shall be punished with death or imprisonment of either description for a term which shall not be less than ten years nor more than twenty-five years, and shall also be liable to fine. (2) Gang rape attracts mandatory death sentence or life imprisonment.',
    courtType: 'Special Courts (Gender-Based Violence) / Sessions Court',
    notes: 'Strengthened under the Anti-Rape (Investigation and Trial) Act, 2021. Mandates fast-track trial, DNA forensics, two-finger test ban, and witness protection.',
    keyTopics: ['Section 376 PPC', 'Rape', 'Anti-Rape Act 2021', 'DNA Evidence', 'Gender-Based Violence'],
    crossReferences: ['Anti-Rape Act 2021', 'Constitution Article 14', 'QSO Article 164']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 420',
    title: 'Cheating and Dishonestly Inducing Delivery of Property',
    category: 'Criminal Law - Fraud & Financial Crimes',
    content: 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
    courtType: 'Magistrate First Class / Sessions Court',
    notes: 'Primary statutory provision for commercial fraud, deceptive financial inducements, and fraudulent contract breaches.',
    keyTopics: ['Section 420 PPC', 'Cheating', 'Fraud', 'Dishonest Inducement', 'White-Collar Crime'],
    crossReferences: ['Section 415 PPC', 'Section 468 PPC', 'Section 471 PPC']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 489-F',
    title: 'Dishonestly Issuing a Cheque',
    category: 'Criminal Law - Banking & Negotiable Instruments',
    content: 'Whoever dishonestly issues a cheque towards repayment of a loan or fulfilment of an obligation which is dishonoured on presentation, shall be punished with imprisonment which may extend to three years, or with fine, or with both, unless he can establish that he made arrangements with his bank to ensure the cheque would be honoured and that the bank was at fault in not honouring the cheque.',
    courtType: 'Magistrate First Class',
    notes: 'Inserted by Criminal Law (Amendment) Ordinance, 2002. Elements required: (1) Cheque issued dishonestly, (2) towards repayment of loan or obligation, (3) dishonoured on presentation. Crucial distinction between commercial dispute vs. criminal deceit.',
    keyTopics: ['Section 489-F PPC', 'Dishonoured Cheque', 'Bounced Cheque', 'Commercial Fraud'],
    crossReferences: ['Negotiable Instruments Act 1881', 'Section 420 PPC']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 468',
    title: 'Forgery for Purpose of Cheating',
    category: 'Criminal Law - Forgery & Fraud',
    content: 'Whoever commits forgery, intending that the document or electronic record forged shall be used for the purpose of cheating, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
    courtType: 'Magistrate First Class / Sessions Court',
    notes: 'Applies to forged sale deeds, counterfeit power of attorneys, fake stamp papers, and altered digital records.',
    keyTopics: ['Section 468 PPC', 'Forgery', 'Fake Documents', 'Counterfeit Title Deed'],
    crossReferences: ['Section 463 PPC', 'Section 471 PPC', 'PECA 2016']
  },
  {
    statuteCode: 'PPC_1860',
    statuteName: 'Pakistan Penal Code, 1860',
    ruleNumber: 'Section 499 & 500',
    title: 'Defamation and Punishment for Defamation',
    category: 'Criminal Law - Defamation',
    content: 'Section 499 defines defamation as making or publishing any imputation concerning any person, intending to harm the reputation of such person, subject to ten statutory exceptions (truth for public good, public conduct of public servants, court reports). Section 500 awards simple imprisonment up to two years, or fine, or both.',
    courtType: 'Sessions Court / Magistrate',
    notes: 'Criminal defamation under PPC operates alongside civil damages under the Defamation Ordinance, 2002 and digital offenses under Section 20 PECA 2016.',
    keyTopics: ['Section 499 PPC', 'Section 500 PPC', 'Defamation', 'Reputation Harm', 'Defamation Ordinance 2002'],
    crossReferences: ['Defamation Ordinance 2002', 'PECA 2016 Section 20', 'Constitution Article 19']
  },

  // CODE OF CRIMINAL PROCEDURE, 1898 - MANDATORY TRIAL & CONFIRMATION
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 374',
    title: 'Sentence of Death to be Submitted by Court of Session for Confirmation (Murder Reference)',
    category: 'Criminal Procedure - Capital Confirmation',
    content: 'When the Court of Session passes sentence of death, the proceedings shall be submitted to the High Court and the sentence shall not be executed unless it is confirmed by the High Court.',
    courtType: 'High Court (Division Bench)',
    notes: 'The mandatory Murder Reference procedure. A death sentence passed under Section 302 PPC cannot be carried out without independent scrutiny, reappraisal of evidence, and formal confirmation by at least two judges of the High Court.',
    keyTopics: ['Section 374 CrPC', 'Murder Reference', 'Death Sentence Confirmation', 'Division Bench Scrutiny'],
    crossReferences: ['PPC Section 302', 'CrPC Section 376', 'CrPC Section 410']
  },
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 410',
    title: 'Appeal from Sentence of Court of Session',
    category: 'Criminal Procedure - Appeals',
    content: 'Any person convicted on a trial held by a Sessions Judge, or an Additional Sessions Judge, may appeal to the High Court.',
    courtType: 'High Court',
    notes: 'Statutory first appeal against conviction in murder, rape, robbery, and major penal trials. The High Court has full power to reappraise facts, reverse findings, and acquit the convict.',
    keyTopics: ['Section 410 CrPC', 'Criminal Appeal', 'High Court Appeal', 'Reappraisal of Evidence'],
    crossReferences: ['CrPC Section 417', 'CrPC Section 423', 'Constitution Article 185']
  },
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 417',
    title: 'Appeal in Case of Acquittal',
    category: 'Criminal Procedure - State Appeals',
    content: '(1) The Provincial Government may, in any case, direct the Public Prosecutor to present an appeal to the High Court from an original or appellate order of acquittal passed by any Court other than a High Court. (2) The complainant may file an application for grant of special leave to appeal from an order of acquittal within thirty days.',
    courtType: 'High Court',
    notes: 'Remedy for victims and the State against erroneous or perverse trial court acquittals. Acquittal carries double presumption of innocence; interference requires showing patent illegality or misreading of evidence.',
    keyTopics: ['Section 417 CrPC', 'Appeal Against Acquittal', 'Presumption of Innocence', 'Complainant Appeal'],
    crossReferences: ['CrPC Section 410', 'Constitution Article 185(2)(a)']
  }
];

async function main() {
  console.log('Seeding Pakistan Penal Code (PPC) and Criminal Procedure Statutes...');
  let count = 0;
  for (const rule of PPC_AND_STATUTORY_PROVISIONS) {
    await prisma.statutoryRule.upsert({
      where: {
        statuteCode_ruleNumber: {
          statuteCode: rule.statuteCode,
          ruleNumber: rule.ruleNumber,
        },
      },
      update: {
        statuteName: rule.statuteName,
        title: rule.title,
        category: rule.category,
        content: rule.content,
        courtType: rule.courtType,
        notes: rule.notes,
        keyTopics: rule.keyTopics,
        crossReferences: rule.crossReferences,
      },
      create: {
        statuteCode: rule.statuteCode,
        statuteName: rule.statuteName,
        ruleNumber: rule.ruleNumber,
        title: rule.title,
        category: rule.category,
        content: rule.content,
        courtType: rule.courtType,
        notes: rule.notes,
        keyTopics: rule.keyTopics,
        crossReferences: rule.crossReferences,
      },
    });
    count++;
  }
  console.log(`Successfully seeded/updated ${count} PPC and Criminal Procedure rules.`);
  const totalRules = await prisma.statutoryRule.count();
  const totalArticles = await prisma.constitutionalArticle.count();
  console.log(`CURRENT DATABASE STATS: Articles = ${totalArticles}, Statutory Rules & Penal Sections = ${totalRules}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
