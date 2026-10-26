import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL || 'postgresql://lms_migrator:lms_migrator_password@localhost:5432/lms_dev?schema=public',
    },
  },
});

interface ArticleSeed {
  articleNumber: string;
  title: string;
  part: string;
  chapter?: string;
  content: string;
  explanation: string;
  keyTopics: string[];
  crossReferences: string[];
  amendmentNotes?: string;
}

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

const CONSTITUTIONAL_ARTICLES: ArticleSeed[] = [
  // PART I - INTRODUCTORY
  {
    articleNumber: '1',
    title: 'The Republic and its territories',
    part: 'Part I: Introductory',
    content: 'Pakistan shall be a Federal Republic to be known as the Islamic Republic of Pakistan, hereinafter referred to as Pakistan. The territories of Pakistan shall comprise: (a) the Provinces of Balochistan, Khyber Pakhtunkhwa, the Punjab and Sindh; (b) the Islamabad Capital Territory; and (c) such States and territories as are or may be included in Pakistan, whether by accession or otherwise.',
    explanation: 'Defines the sovereign territorial boundary and federal nature of Pakistan following the 25th Constitutional Amendment (merger of FATA into Khyber Pakhtunkhwa).',
    keyTopics: ['Federal Republic', 'Territories', 'Provinces', 'Islamabad Capital Territory'],
    crossReferences: ['Article 2', 'Article 2A', 'Article 257'],
    amendmentNotes: 'Amended by Constitution (Twenty-fifth Amendment) Act, 2018 (Act XXXVII of 2018).'
  },
  {
    articleNumber: '2',
    title: 'Islam to be State religion',
    part: 'Part I: Introductory',
    content: 'Islam shall be the State religion of Pakistan.',
    explanation: 'Declares Islam as the official State religion, guiding state policy, legal interpretation, and statutory compliance with Islamic injunctions.',
    keyTopics: ['State Religion', 'Islamic Provisions', 'Sovereignty'],
    crossReferences: ['Article 2A', 'Article 227']
  },
  {
    articleNumber: '2A',
    title: 'The Objectives Resolution to form part of substantive provisions',
    part: 'Part I: Introductory',
    content: 'The principles and provisions set out in the Objectives Resolution reproduced in the Annex are hereby made substantive part of the Constitution and shall have effect accordingly. Sovereignty over the entire universe belongs to Almighty Allah alone, and the authority to be exercised by the people of Pakistan within the limits prescribed by Him is a sacred trust.',
    explanation: 'Inserted by Presidential Order 14 of 1985 (Revival of Constitution Order). Elevated the Objectives Resolution from a preamble to an enforceable, substantive constitutional provision. Emphasizes independence of judiciary, fundamental rights, and democratic principles.',
    keyTopics: ['Objectives Resolution', 'Substantive Law', 'Sovereignty of Allah', 'Independence of Judiciary'],
    crossReferences: ['Article 2', 'Article 175', 'Article 227'],
    amendmentNotes: 'Inserted by P.O. No. 14 of 1985; affirmed and retained post-18th Amendment.'
  },
  {
    articleNumber: '4',
    title: 'Right of individuals to be dealt with in accordance with law, etc.',
    part: 'Part I: Introductory',
    content: '(1) To enjoy the protection of law and to be treated in accordance with law is the inalienable right of every citizen, wherever he may be, and of every other person for the time being within Pakistan. (2) In particular: (a) no action detrimental to the life, liberty, body, reputation or property of any person shall be taken except in accordance with law; (b) no person shall be prevented from, or be hindered in doing, that which is not prohibited by law; and (c) no person shall be compelled to do that which the law does not require him to do.',
    explanation: 'The cornerstone of the Rule of Law and procedural fairness in Pakistan. Prohibits arbitrary executive action, ultra vires statutory excesses, and unauthorized state incursions into citizen liberties and property.',
    keyTopics: ['Rule of Law', 'Due Process', 'Protection of Law', 'Arbitrary Action', 'Natural Justice'],
    crossReferences: ['Article 9', 'Article 10A', 'Article 25', 'Article 199'],
    amendmentNotes: 'Sacrosanct non-derogable article; cited in virtually all constitutional writ petitions.'
  },
  {
    articleNumber: '5',
    title: 'Loyalty to State and obedience to Constitution and law',
    part: 'Part I: Introductory',
    content: '(1) Loyalty to the State is the basic duty of every citizen. (2) Obedience to the Constitution and law is the inviolable obligation of every citizen wherever he may be and of every other person for the time being within Pakistan.',
    explanation: 'Establishes the paramount duty of constitutional obedience and state allegiance binding all citizens, public officials, and institutions.',
    keyTopics: ['Loyalty to State', 'Obedience to Law', 'Constitutional Supremacy'],
    crossReferences: ['Article 6']
  },
  {
    articleNumber: '6',
    title: 'High treason',
    part: 'Part I: Introductory',
    content: '(1) Any person who abrogates or subverts or suspends or holds in abeyance, or attempts or conspires to abrogate or subvert or suspend or hold in abeyance, the Constitution by use of force or show of force or by any other unconstitutional means shall be guilty of high treason. (2) Any person aiding or abetting or collaborating in the acts mentioned in clause (1) shall likewise be guilty of high treason. (2A) An act of high treason mentioned in clause (1) or clause (2) shall not be validated by any court including the Supreme Court and a High Court. (3) Majlis-e-Shoora (Parliament) shall by law provide for the punishment of persons found guilty of high treason.',
    explanation: 'Precludes military coups or unconstitutional suspensions of the Constitution. Clause 2A (added by the 18th Amendment) specifically bars the judiciary from invoking the "Doctrine of Necessity" to validate unconstitutional takings.',
    keyTopics: ['High Treason', 'Abrogation of Constitution', 'Doctrine of Necessity Barred', '18th Amendment'],
    crossReferences: ['Article 5', 'Article 232', 'High Treason (Punishment) Act 1973'],
    amendmentNotes: 'Clause 2A inserted by the Constitution (Eighteenth Amendment) Act, 2010.'
  },

  // PART II - CHAPTER 1: FUNDAMENTAL RIGHTS
  {
    articleNumber: '8',
    title: 'Laws inconsistent with or in derogation of Fundamental Rights to be void',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) Any law, or any custom or usage having the force of law, in so far as it is inconsistent with the rights conferred by this Chapter, shall, to the extent of such inconsistency, be void. (2) The State shall not make any law which takes away or abridges the rights so conferred and any law made in contravention of this clause shall, to the extent of the contravention, be void. (3) The provisions of this Article shall not apply to laws relating to Armed Forces, police, or specified welfare enactments.',
    explanation: 'Constitutional shield rendering ultra vires and null any legislation, ordinance, or delegated regulation that abridges fundamental rights.',
    keyTopics: ['Void Laws', 'Supremacy of Fundamental Rights', 'Judicial Review', 'Ultra Vires'],
    crossReferences: ['Article 4', 'Article 184(3)', 'Article 199']
  },
  {
    articleNumber: '9',
    title: 'Security of person',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'No person shall be deprived of life or liberty save in accordance with law.',
    explanation: 'Extensively interpreted by the Supreme Court of Pakistan (Shehla Zia case, etc.) to encompass not merely physical existence, but human dignity, clean drinking water, environmental protection, health, livelihoods, and freedom from unlawful detention.',
    keyTopics: ['Right to Life', 'Personal Liberty', 'Environmental Jurisprudence', 'Unlawful Detention', 'Dignity'],
    crossReferences: ['Article 4', 'Article 10', 'Article 14', 'Article 199']
  },
  {
    articleNumber: '10',
    title: 'Safeguards as to arrest and detention',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) No person who is arrested shall be detained in custody without being informed, as soon as may be, of the grounds for such arrest, nor shall he be denied the right to consult and be defended by a legal practitioner of his choice. (2) Every person who is arrested and detained in custody shall be produced before a magistrate within a period of twenty-four hours of such arrest... (3)-(8) Specific restrictions and review boards governing preventive detention.',
    explanation: 'Protects arrested individuals against arbitrary police holding, mandates production before a judicial magistrate within 24 hours, and secures the right of legal counsel.',
    keyTopics: ['Safeguards upon Arrest', 'Right to Counsel', '24-hour Magistrate Production', 'Preventive Detention'],
    crossReferences: ['Article 9', 'Article 10A', 'CrPC Section 61', 'CrPC Section 167']
  },
  {
    articleNumber: '10A',
    title: 'Right to fair trial and due process',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'For the determination of his civil rights and obligations or in any criminal charge against him a person shall be entitled to a fair trial and due process.',
    explanation: 'Introduced via the 18th Constitutional Amendment (2010). Guarantees procedural fairness, unbiased adjudication, right of hearing (audi alteram partem), impartial tribunal, and timely proceedings across civil, criminal, tax, regulatory, and disciplinary proceedings.',
    keyTopics: ['Fair Trial', 'Due Process', 'Audi Alteram Partem', 'Impartial Adjudication', 'Natural Justice'],
    crossReferences: ['Article 4', 'Article 9', 'Article 25', 'Article 199'],
    amendmentNotes: 'Inserted by the Constitution (Eighteenth Amendment) Act, 2010.'
  },
  {
    articleNumber: '11',
    title: 'Slavery, forced labour, etc., prohibited',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) Slavery is non-existent and forbidden and no law shall permit or facilitate its introduction into Pakistan in any form. (2) All forms of forced labour and traffic in human beings are prohibited. (3) No child below the age of fourteen years shall be engaged in any factory or mine or any other hazardous employment.',
    explanation: 'Prohibits bonded labour, human trafficking, and hazardous child labour. Foundational to the Bonded Labour System (Abolition) Act 1992.',
    keyTopics: ['Slavery Prohibited', 'Forced Labour', 'Child Labour', 'Bonded Labour'],
    crossReferences: ['Article 9', 'Article 25A', 'Bonded Labour System (Abolition) Act 1992']
  },
  {
    articleNumber: '12',
    title: 'Protection against retrospective punishment',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) No law shall authorize the punishment of a person: (a) for an act or omission that was not punishable by law at the time of the act or omission; or (b) for an offence by a penalty greater than, or of a kind different from, the penalty prescribed by law for that offence at the time the offence was committed.',
    explanation: 'Universal protection against ex post facto criminal penalization. The legislature cannot retroactively criminalize past lawful conduct.',
    keyTopics: ['Ex Post Facto Law', 'Retrospective Punishment', 'Criminal Jurisprudence'],
    crossReferences: ['Article 4', 'Article 10A']
  },
  {
    articleNumber: '13',
    title: 'Protection against double jeopardy and self-incrimination',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'No person: (a) shall be prosecuted or punished for the same offence more than once; or (b) shall, when accused of an offence, be compelled to be a witness against himself.',
    explanation: 'Codifies double jeopardy (autrefois acquit / autrefois convict) and the right against self-incrimination (nemo tenetur seipsum accusare).',
    keyTopics: ['Double Jeopardy', 'Self-Incrimination', 'Criminal Defense', 'CrPC Section 403'],
    crossReferences: ['CrPC Section 403', 'QSO Article 15', 'General Clauses Act Section 26']
  },
  {
    articleNumber: '14',
    title: 'Inviolability of dignity of man, etc.',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) The dignity of man and, subject to law, the privacy of home, shall be inviolable. (2) No person shall be subjected to torture for the purpose of extracting evidence.',
    explanation: 'Absolute constitutional ban on custodial torture, police brutality, and invasion of home privacy without valid judicial warrant.',
    keyTopics: ['Human Dignity', 'Privacy of Home', 'Prohibition of Custodial Torture', 'Search Warrants'],
    crossReferences: ['Article 9', 'Torture and Custodial Death (Prevention and Punishment) Act 2022', 'CrPC Section 103']
  },
  {
    articleNumber: '15',
    title: 'Freedom of movement, etc.',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Every citizen shall have the right to remain in, and, subject to any reasonable restriction imposed by law in the public interest, enter and move freely throughout Pakistan and to reside and settle in any part thereof.',
    explanation: 'Guarantees freedom of travel within Pakistan and right to return. Often litigated regarding Exit Control List (ECL) placements.',
    keyTopics: ['Freedom of Movement', 'Exit Control List (ECL)', 'Public Interest Restrictions'],
    crossReferences: ['Exit from Pakistan (Control) Ordinance 1981', 'Article 4', 'Article 199']
  },
  {
    articleNumber: '16',
    title: 'Freedom of assembly',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Every citizen shall have the right to assemble peacefully and without arms, subject to any reasonable restrictions imposed by law in the interest of public order.',
    explanation: 'Protects the right to peaceful political, social, and civic assembly, rallies, and demonstrations.',
    keyTopics: ['Freedom of Assembly', 'Peaceful Protest', 'Public Order Restrictions'],
    crossReferences: ['CrPC Section 144', 'Article 17']
  },
  {
    articleNumber: '17',
    title: 'Freedom of association',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) Every citizen shall have the right to form associations or unions, subject to any reasonable restrictions imposed by law in the interest of sovereignty or integrity of Pakistan, public order or morality. (2) Every citizen, not being in the service of Pakistan, shall have the right to form or be a member of a political party...',
    explanation: 'Protects trade unions, professional associations (such as bar councils), and the constitutional right to form and participate in political parties.',
    keyTopics: ['Freedom of Association', 'Political Parties', 'Trade Unions', 'Elections Act 2017'],
    crossReferences: ['Elections Act 2017', 'Industrial Relations Act']
  },
  {
    articleNumber: '18',
    title: 'Freedom of trade, business or profession',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Subject to such qualifications, if any, as may be prescribed by law, every citizen shall have the right to enter upon any lawful profession or occupation, and to conduct any lawful trade or business: Provided that nothing in this Article shall prevent: (a) the regulation of any trade or profession by a licensing system; or (b) the regulation of trade, commerce or industry in the interest of free competition; or (c) the carrying on, by the Federal Government or a Provincial Government, of any trade, business, industry or service to the exclusion of other persons.',
    explanation: 'Guarantees economic freedom, commercial entrepreneurship, and professional practice. Prevents unlawful state monopolies, anti-competitive restrictions, and arbitrary licensing cancellations.',
    keyTopics: ['Freedom of Trade', 'Right to Profession', 'Licensing Systems', 'Competition Law', 'State Monopoly'],
    crossReferences: ['Competition Act 2010', 'Article 4', 'Article 25']
  },
  {
    articleNumber: '19',
    title: 'Freedom of speech, etc.',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Every citizen shall have the right to freedom of speech and expression, and there shall be freedom of the press, subject to any reasonable restrictions imposed by law in the interest of the glory of Islam or the integrity, security or defence of Pakistan or any part thereof, friendly relations with foreign States, public order, decency or morality, or in relation to contempt of court, commission of or incitement to an offence.',
    explanation: 'Protects free speech, journalism, broadcast media, and digital expression subject to defined constitutional caveats.',
    keyTopics: ['Freedom of Speech', 'Freedom of the Press', 'Defamation', 'Contempt of Court', 'PECA 2016'],
    crossReferences: ['Article 19A', 'Article 204', 'PECA 2016', 'PEMRA Ordinance 2002']
  },
  {
    articleNumber: '19A',
    title: 'Right to information',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Every citizen shall have the right to have access to information in all matters of public importance subject to regulation and reasonable restrictions imposed by law.',
    explanation: 'Introduced by the 18th Constitutional Amendment. Transforms government transparency and public record access into an enforceable fundamental right.',
    keyTopics: ['Right to Information', 'Access to Public Records', 'Transparency', 'Public Importance'],
    crossReferences: ['Right of Access to Information Act 2017', 'Article 4'],
    amendmentNotes: 'Inserted by the Constitution (Eighteenth Amendment) Act, 2010.'
  },
  {
    articleNumber: '20',
    title: 'Freedom to profess religion and to manage religious institutions',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Subject to law, public order and morality: (a) every citizen has the right to profess, practise and propagate his religion; and (b) every religious denomination and every sect thereof has the right to establish, maintain and manage its religious institutions.',
    explanation: 'Protects religious freedom for all faiths and sects in Pakistan, including administration of minority worship places.',
    keyTopics: ['Freedom of Religion', 'Religious Minorities', 'Places of Worship'],
    crossReferences: ['Article 21', 'Article 22', 'Article 25']
  },
  {
    articleNumber: '23',
    title: 'Provision as to property',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'Every citizen shall have the right to acquire, hold and dispose of property in any part of Pakistan, subject to the Constitution and any reasonable restrictions imposed by law in the public interest.',
    explanation: 'Fundamental right to own, convey, and hold immovable and movable property across Pakistan.',
    keyTopics: ['Right to Property', 'Acquisition and Disposal', 'Land Ownership'],
    crossReferences: ['Article 24', 'Transfer of Property Act 1882']
  },
  {
    articleNumber: '24',
    title: 'Protection of property rights',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) No person shall be compulsorily deprived of his property save by authority of law. (2) No property shall be compulsorily acquired or taken possession of save for a public purpose, and save by the authority of law which provides for compensation therefor and either fixes the amount of compensation or specifies the principles on and the manner in which compensation is to be determined and given.',
    explanation: 'Protects private property against unlawful state expropriation. Governs compulsory acquisition under Land Acquisition Act 1894, demanding fair market compensation and public necessity.',
    keyTopics: ['Expropriation', 'Compulsory Acquisition', 'Public Purpose', 'Fair Compensation'],
    crossReferences: ['Article 23', 'Land Acquisition Act 1894', 'Article 4']
  },
  {
    articleNumber: '25',
    title: 'Equality of citizens',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: '(1) All citizens are equal before law and are entitled to equal protection of law. (2) There shall be no discrimination on the basis of sex. (3) Nothing in this Article shall prevent the State from making any special provision for the protection of women and children.',
    explanation: 'The paramount equal protection clause. Prohibits arbitrary classification, discriminatory administrative action, and gender discrimination, while permitting affirmative action for vulnerable demographics.',
    keyTopics: ['Equality Before Law', 'Equal Protection', 'Non-Discrimination', 'Affirmative Action for Women & Children'],
    crossReferences: ['Article 4', 'Article 8', 'Article 25A', 'Article 27']
  },
  {
    articleNumber: '25A',
    title: 'Right to education',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 1: Fundamental Rights',
    content: 'The State shall provide free and compulsory education to all children of the age of five to sixteen years in such manner as may be determined by law.',
    explanation: 'Inserted by 18th Amendment. Places a mandatory positive obligation on the State to guarantee free education to youth aged 5-16.',
    keyTopics: ['Right to Education', 'Free & Compulsory Education', 'Child Welfare'],
    crossReferences: ['Article 11', 'Article 25'],
    amendmentNotes: 'Inserted by the Constitution (Eighteenth Amendment) Act, 2010.'
  },

  // PART III - THE FEDERATION OF PAKISTAN
  {
    articleNumber: '41',
    title: 'The President',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 1: The President',
    content: '(1) There shall be a President of Pakistan who shall be the Head of State and shall represent the unity of the Republic. (2) A person shall not be qualified for election as President unless he is a Muslim of not less than forty-five years of age and is qualified to be elected as member of the National Assembly. (3) The President shall be elected in accordance with the provisions of the Second Schedule by the members of an electoral college consisting of: (a) members of both Houses; and (b) members of the Provincial Assemblies.',
    explanation: 'Head of State of Pakistan, elected by federal Parliament and all four Provincial Assemblies.',
    keyTopics: ['President of Pakistan', 'Head of State', 'Electoral College', 'Qualifications'],
    crossReferences: ['Article 44', 'Article 48', 'Second Schedule']
  },
  {
    articleNumber: '48',
    title: 'President to act on advice, etc.',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 1: The President',
    content: '(1) In the exercise of his functions, the President shall act on and in accordance with the advice of the Cabinet or the Prime Minister: Provided that the President may require the Cabinet or, as the case may be, the Prime Minister to reconsider such advice... (2) Notwithstanding anything contained in clause (1), the President shall act in his discretion in respect of any matter in respect of which he is empowered by the Constitution to do so.',
    explanation: 'Establishes the parliamentary supremacy of executive power. President is bound by the binding advice of the Prime Minister and Cabinet.',
    keyTopics: ['Presidential Advice', 'Prime Minister', 'Cabinet Advice', 'Constitutional Powers'],
    crossReferences: ['Article 90', 'Article 91']
  },
  {
    articleNumber: '50',
    title: 'Majlis-e-Shoora (Parliament)',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: 'There shall be a Majlis-e-Shoora (Parliament) of Pakistan consisting of the President and two Houses to be known respectively as the National Assembly and the Senate.',
    explanation: 'Bicameral structure of the federal legislature combining National Assembly (population representation) and Senate (equal provincial representation).',
    keyTopics: ['Parliament', 'Majlis-e-Shoora', 'National Assembly', 'Senate'],
    crossReferences: ['Article 51', 'Article 59', 'Article 70']
  },
  {
    articleNumber: '70',
    title: 'Introduction and passing of Bills',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) A Bill with respect to any matter in the Federal Legislative List may originate in either House and shall, if it is passed by the House in which it originated, be transmitted to the other House; and, if the Bill is passed without amendment by the other House also, it shall be presented to the President for assent.',
    explanation: 'Primary legislative procedure for passing federal enactments.',
    keyTopics: ['Legislative Procedure', 'Bills', 'Federal Legislative List', 'Presidential Assent'],
    crossReferences: ['Article 73', 'Article 75', 'Fourth Schedule']
  },
  {
    articleNumber: '73',
    title: 'Procedure with respect to Money Bills',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) Notwithstanding anything contained in Article 70, a Money Bill shall originate in the National Assembly: Provided that a copy thereof shall be transmitted to the Senate, which may, within fourteen days, make recommendations thereon to the National Assembly. (2) Defines Money Bill concerning taxation, consolidated fund, borrowing.',
    explanation: 'Exclusive prerogative of the National Assembly over fiscal, budget, and taxation legislation.',
    keyTopics: ['Money Bill', 'Taxation', 'Finance Act', 'Federal Consolidated Fund', 'Budget'],
    crossReferences: ['Article 70', 'Article 77', 'Article 80']
  },
  {
    articleNumber: '89',
    title: 'Power of President to promulgate Ordinances',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) The President may, except when the Senate or National Assembly is in session, if satisfied that circumstances exist which render it necessary to take immediate action, make and promulgate an Ordinance as the circumstances appear to him to require. (2) An Ordinance promulgated under this Article shall have the same force and effect as an Act of Majlis-e-Shoora, but shall stand repealed at the expiration of one hundred and twenty days from its promulgation unless extended or approved.',
    explanation: 'Executive emergency lawmaking when Parliament is in recess. Constrained by 120-day sunset clause, single extension limit, and prohibition against re-promulgation of lapsed ordinances.',
    keyTopics: ['Presidential Ordinance', 'Emergency Lawmaking', '120-day Sunset Clause', 'Re-promulgation Barred'],
    crossReferences: ['Article 70', 'Article 128']
  },
  {
    articleNumber: '90',
    title: 'The Federal Government',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 3: The Federal Government',
    content: '(1) The executive authority of the Federation shall be exercised in the name of the President by the Federal Government, consisting of the Prime Minister and the Federal Ministers, which shall act through the Prime Minister who shall be the chief executive of the Federation. (2) In the performance of his functions under the Constitution, the Prime Minister may act either directly or through the Federal Ministers.',
    explanation: 'Defines the Federal Government as the Prime Minister and Federal Cabinet as held in the landmark Mustafa Impex case (PLD 2016 SC 808).',
    keyTopics: ['Federal Government', 'Prime Minister', 'Cabinet', 'Executive Authority', 'Mustafa Impex Case'],
    crossReferences: ['Article 48', 'Article 91', 'Article 99']
  },

  // PART V - RELATIONS BETWEEN FEDERATION AND PROVINCES
  {
    articleNumber: '141',
    title: 'Extent of Federal and Provincial laws',
    part: 'Part V: Relations Between Federation and Provinces',
    chapter: 'Chapter 1: Distribution of Legislative Powers',
    content: 'Subject to the Constitution, Majlis-e-Shoora (Parliament) may make laws (including laws having extra-territorial operation) for the whole or any part of Pakistan, and a Provincial Assembly may make laws for the Province or any part thereof.',
    explanation: 'Defines territorial limits of federal legislation vs. provincial statutes.',
    keyTopics: ['Legislative Powers', 'Territorial Jurisdiction', 'Federal Laws', 'Provincial Laws'],
    crossReferences: ['Article 142', 'Article 143', 'Fourth Schedule']
  },
  {
    articleNumber: '142',
    title: 'Subject-matter of Federal and Provincial laws',
    part: 'Part V: Relations Between Federation and Provinces',
    chapter: 'Chapter 1: Distribution of Legislative Powers',
    content: 'Subject to the Constitution: (a) Majlis-e-Shoora (Parliament) shall have exclusive power to make laws with respect to any matter in the Federal Legislative List; (b) Majlis-e-Shoora and a Provincial Assembly shall have power to make laws with respect to criminal law, criminal procedure and evidence; (c) Subject to paragraph (b), a Provincial Assembly shall, and Majlis-e-Shoora shall not, have power to make laws with respect to any matter not enumerated in the Federal Legislative List; (d) Majlis-e-Shoora shall have exclusive power to make laws with respect to all matters for areas not included in any Province.',
    explanation: 'Post-18th Amendment legislative division. Abolished the Concurrent Legislative List; residual legislative authority vests exclusively in Provincial Assemblies.',
    keyTopics: ['Federal Legislative List', 'Provincial Autonomy', '18th Amendment', 'Residual Powers'],
    crossReferences: ['Article 141', 'Article 143', 'Fourth Schedule'],
    amendmentNotes: 'Substituted by the Constitution (Eighteenth Amendment) Act, 2010.'
  },
  {
    articleNumber: '143',
    title: 'Inconsistency between Federal and Provincial laws',
    part: 'Part V: Relations Between Federation and Provinces',
    chapter: 'Chapter 1: Distribution of Legislative Powers',
    content: 'If any provision of an Act of a Provincial Assembly is repugnant to any provision of an Act of Majlis-e-Shoora (Parliament) which Majlis-e-Shoora is competent to enact, then the Act of Majlis-e-Shoora, whether passed before or after the Act of the Provincial Assembly, shall prevail and the Act of the Provincial Assembly shall, to the extent of the repugnancy, be void.',
    explanation: 'Federal supremacy clause when both levels possess concurrent competence over shared matters such as criminal law or evidence.',
    keyTopics: ['Repugnancy', 'Federal Supremacy', 'Pre-emption', 'Inconsistency'],
    crossReferences: ['Article 142']
  },
  {
    articleNumber: '153',
    title: 'Council of Common Interests (CCI)',
    part: 'Part V: Relations Between Federation and Provinces',
    chapter: 'Chapter 3: Special Provisions',
    content: '(1) There shall be a Council of Common Interests, in this Chapter referred to as the Council, to be appointed by the President. (2) The Council shall consist of: (a) the Prime Minister who shall be the Chairman of the Council; (b) the Chief Ministers of the Provinces; and (c) three members from the Federal Government to be nominated by the Prime Minister from time to time.',
    explanation: 'Constitutional constitutional apex body resolving inter-provincial and federation-province policy disputes on water, energy, natural resources, and railways.',
    keyTopics: ['Council of Common Interests', 'CCI', 'Inter-Provincial Relations', 'Federalism'],
    crossReferences: ['Article 154', 'Article 155', 'Article 161']
  },
  {
    articleNumber: '155',
    title: 'Complaints as to interference with water supplies',
    part: 'Part V: Relations Between Federation and Provinces',
    chapter: 'Chapter 3: Special Provisions',
    content: '(1) If the interests of a Province, the Federal Capital or any of the inhabitants thereof, in the water from any natural source of supply, or any reservoir, pipeline or other waterworks, have been, or are likely to be, affected prejudicially by: (a) any executive act or legislation; or (b) the failure of any authority to exercise any of its powers with respect to the use and distribution or control of water from that source, the Province or the Federal Government may complain to the Council of Common Interests.',
    explanation: 'Governs national water rights disputes between provinces and the federation, IRSA apportionment, and inter-provincial river flows.',
    keyTopics: ['Water Disputes', 'IRSA', 'Interference with Water Supplies', 'Council of Common Interests'],
    crossReferences: ['Article 153', 'Article 154', 'IRSA Act 1992']
  },

  // PART VII - THE JUDICATURE
  {
    articleNumber: '175',
    title: 'Establishment and jurisdiction of courts',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 1: The Courts',
    content: '(1) There shall be a Supreme Court of Pakistan, a High Court for each Province and a High Court for the Islamabad Capital Territory, and such other courts as may be established by law. (2) No court shall have any jurisdiction save as is or may be conferred on it by the Constitution or by or under any law. (3) The Judiciary shall be separated progressively from the Executive within fourteen years from the commencing day.',
    explanation: 'Foundation of the judicial branch in Pakistan and separation of powers between the judiciary and executive.',
    keyTopics: ['Establishment of Courts', 'Supreme Court', 'High Courts', 'Separation of Powers', 'Jurisdiction'],
    crossReferences: ['Article 175A', 'Article 184', 'Article 199', 'Article 202']
  },
  {
    articleNumber: '175A',
    title: 'Appointment of Judges to the Supreme Court, High Courts and the Federal Shariat Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 1: The Courts',
    content: '(1) There shall be a Judicial Commission of Pakistan, in this Article referred to as the Commission, for appointment of Judges of the Supreme Court, High Courts and the Federal Shariat Court. Comprises Chief Justice of Pakistan, senior judges, Law Minister, Attorney-General, Senior Advocate nominated by Pakistan Bar Council, parliamentary members, and woman/non-Muslim representation per the 26th Amendment.',
    explanation: 'Constitutional procedure for appointing superior court judges via the Judicial Commission of Pakistan (JCP) and Parliamentary Committee. Significantly revamped under the 26th Constitutional Amendment (2024).',
    keyTopics: ['Judicial Appointments', 'Judicial Commission of Pakistan', 'JCP', '26th Amendment', 'Parliamentary Committee'],
    crossReferences: ['Article 175', 'Article 177', 'Article 193'],
    amendmentNotes: 'Inserted by the 18th Amendment; amended by 19th Amendment; comprehensively restructured by the Constitution (Twenty-sixth Amendment) Act, 2024.'
  },
  {
    articleNumber: '177',
    title: 'Appointment of Supreme Court Judges',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: '(1) The Chief Justice of Pakistan and each of other Judges of the Supreme Court shall be appointed by the President in accordance with Article 175A. (2) A person shall not be appointed a Judge of the Supreme Court unless he is a citizen of Pakistan and: (a) has for a period of, or for periods aggregating, not less than five years been a judge of a High Court; or (b) has for a period of, or for periods aggregating, not less than fifteen years been an advocate of a High Court.',
    explanation: 'Qualifications and appointment conditions for Justices of the Supreme Court of Pakistan.',
    keyTopics: ['Supreme Court Judges', 'Eligibility Qualifications', 'Seniority', '26th Amendment'],
    crossReferences: ['Article 175A', 'Article 179']
  },
  {
    articleNumber: '184',
    title: 'Original Jurisdiction of Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: '(1) The Supreme Court shall, to the exclusion of every other court, have original jurisdiction in any dispute between any two or more Governments. (2) In the exercise of the jurisdiction conferred on it by clause (1), the Supreme Court shall pronounce declaratory judgments only. (3) Without prejudice to the provisions of Article 199, the Supreme Court shall, if it considers that a question of public importance with reference to the enforcement of any of the Fundamental Rights conferred by Chapter 1 of Part II is involved, have the power to make an order of the nature mentioned in the said Article.',
    explanation: 'Provides original federal jurisdiction over inter-governmental disputes and original suo motu / public interest enforcement of Fundamental Rights under Article 184(3). Under the 26th Amendment, constitutional petitions are heard by the Constitutional Benches (Article 191A).',
    keyTopics: ['Original Jurisdiction', 'Article 184(3)', 'Public Interest Litigation', 'Fundamental Rights', 'Suo Motu', 'Constitutional Benches'],
    crossReferences: ['Article 185', 'Article 191A', 'Article 199', 'Supreme Court (Practice and Procedure) Act 2023'],
    amendmentNotes: 'Read subject to the Constitution (Twenty-sixth Amendment) Act, 2024 establishing Constitutional Benches under Article 191A.'
  },
  {
    articleNumber: '185',
    title: 'Appellate jurisdiction of Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: '(1) Subject to this Article, the Supreme Court shall have jurisdiction to hear and determine appeals from judgments, decrees, final orders or sentences of a High Court. (2) An appeal shall lie to the Supreme Court as of right in capital sentences, reversals of acquittal, or constitutional certificate cases. (3) An appeal to the Supreme Court from a judgment, decree, order or sentence of a High Court in a case to which clause (2) does not apply shall lie only if the Supreme Court grants leave to appeal (CPLA).',
    explanation: 'The primary appellate route in Pakistan: Civil Petitions for Leave to Appeal (CPLA) and Criminal Petitions for Leave to Appeal (CrPLA).',
    keyTopics: ['Appellate Jurisdiction', 'Civil Petition for Leave to Appeal', 'CPLA', 'CrPLA', 'Leave Grant'],
    crossReferences: ['Article 184', 'Article 187', 'Supreme Court Rules 1980']
  },
  {
    articleNumber: '187',
    title: 'Issue and execution of processes of Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: '(1) Subject to clause (2) of Article 175, the Supreme Court shall have power to issue such directions, orders or decrees as may be necessary for doing complete justice in any case or matter pending before it, including an order for the purpose of securing the attendance of any person or the discovery or production of any document.',
    explanation: 'The plenary "Complete Justice" doctrine enabling the Supreme Court to fashion equitable, comprehensive remedies beyond technical statutory constraints.',
    keyTopics: ['Complete Justice', 'Plenary Powers', 'Discovery', 'Enforcement of Supreme Court Orders'],
    crossReferences: ['Article 189', 'Article 190']
  },
  {
    articleNumber: '189',
    title: 'Decisions of Supreme Court binding on other courts',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: 'Any decision of the Supreme Court shall, to the extent that it decides a question of law or is based upon or enunciates a principle of law, be binding on all other courts in Pakistan.',
    explanation: 'The constitutional doctrine of stare decisis. Decisions of the Supreme Court on questions of law bind all High Courts, subordinate courts, and tribunals nationwide.',
    keyTopics: ['Stare Decisis', 'Binding Precedent', 'Question of Law', 'Ratio Decidendi'],
    crossReferences: ['Article 190', 'Article 201']
  },
  {
    articleNumber: '190',
    title: 'Action in aid of Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: 'All executive and judicial authorities throughout Pakistan shall act in aid of the Supreme Court.',
    explanation: 'Constitutional mandate compelling all law enforcement, military, federal/provincial agencies, and executive officials to enforce Supreme Court orders.',
    keyTopics: ['Aid of Supreme Court', 'Executive Duty', 'Enforcement of Judgments'],
    crossReferences: ['Article 187', 'Article 189', 'Article 204']
  },
  {
    articleNumber: '191A',
    title: 'Constitutional Benches of the Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: '(1) There shall be a Constitutional Bench of the Supreme Court comprising such Judges as may be nominated by the Judicial Commission of Pakistan from time to time. (2) The most senior Judge among the nominated Judges shall preside over the Constitutional Bench. (3) The Constitutional Bench shall have exclusive jurisdiction to hear and determine: (a) matters arising out of Article 184; (b) appeals from judgments or orders of a High Court involving substantial question of law as to the interpretation of the Constitution under Article 185; and (c) any advisory reference made under Article 186.',
    explanation: 'Created by the 26th Constitutional Amendment (October 2024). Segregates constitutional litigation, Article 184(3) matters, and constitutional interpretation into dedicated Constitutional Benches nominated by the JCP.',
    keyTopics: ['Constitutional Benches', '26th Amendment', 'Article 184 Jurisdiction', 'Constitutional Interpretation', 'JCP Nomination'],
    crossReferences: ['Article 175A', 'Article 184', 'Article 185', 'Article 186', 'Article 202A'],
    amendmentNotes: 'Inserted by the Constitution (Twenty-sixth Amendment) Act, 2024.'
  },
  {
    articleNumber: '199',
    title: 'Jurisdiction of High Court (Writ Jurisdiction)',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 3: The High Courts',
    content: '(1) Subject to the Constitution, a High Court may, if it is satisfied that no other adequate remedy is provided by law: (a) on the application of any aggrieved party, make an order: (i) directing a person performing, within the territorial jurisdiction of the Court, functions in connection with the affairs of the Federation, a Province or a local authority, to refrain from doing anything he is not permitted by law to do, or to do anything he is required by law to do (Prohibition & Mandamus); or (ii) declaring that any act done or proceeding taken within the territorial jurisdiction of the Court by a person performing functions in connection with the affairs of the Federation, a Province or a local authority has been done or taken without lawful authority and is of no legal effect (Certiorari); or (b) on the application of any person, make an order: (i) that a person in custody within the territorial jurisdiction of the Court be brought before it so that the Court may satisfy itself that he is not being held in custody without lawful authority or in an unlawful manner (Habeas Corpus); or (ii) requiring a person in the territorial jurisdiction of the Court holding or purporting to hold a public office to show under what authority of law he claims to hold that office (Quo Warranto); or (c) on the application of any aggrieved person, make an order giving such directions to any person or authority, including any Government... for the enforcement of any of the Fundamental Rights.',
    explanation: 'The bedrock of constitutional judicial review in Pakistan. Empowers High Courts to issue Writs of Mandamus, Prohibition, Certiorari, Habeas Corpus, and Quo Warranto against unlawful state actions, statutory violations, and fundamental rights infringements where no adequate alternative remedy exists.',
    keyTopics: ['Writ Petition', 'Mandamus', 'Certiorari', 'Habeas Corpus', 'Quo Warranto', 'Prohibition', 'Judicial Review', 'Aggrieved Party', 'Adequate Remedy'],
    crossReferences: ['Article 4', 'Article 8', 'Article 9', 'Article 10A', 'Article 25', 'Article 201', 'Article 202A']
  },
  {
    articleNumber: '201',
    title: 'Decision of High Court binding on subordinate courts',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 3: The High Courts',
    content: 'Subject to Article 189, any decision of a High Court shall, to the extent that it decides a question of law or is based upon or enunciates a principle of law, be binding on all courts subordinate to it.',
    explanation: 'Provincial stare decisis. Decisions of a High Court on questions of law bind all civil courts, sessions courts, and specialized tribunals across its provincial territory.',
    keyTopics: ['Binding Precedent of High Court', 'Subordinate Courts', 'Stare Decisis'],
    crossReferences: ['Article 189', 'Article 202', 'Article 203']
  },
  {
    articleNumber: '202A',
    title: 'Constitutional Benches of High Courts',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 3: The High Courts',
    content: '(1) There shall be a Constitutional Bench of each High Court comprising such Judges as may be nominated by the Judicial Commission of Pakistan from time to time. (2) The most senior Judge among the nominated Judges shall preside over the Constitutional Bench. (3) The Constitutional Bench shall hear and determine: (a) matters arising out of clause (1) of Article 199 where a challenge to the constitutional validity of any Act of Parliament or Provincial Assembly is made; and (b) any other matter involving substantial questions of constitutional interpretation.',
    explanation: 'Established by the 26th Constitutional Amendment (2024) to handle constitutional challenges to primary statutes and major constitutional controversies in High Courts.',
    keyTopics: ['Constitutional Benches of High Courts', '26th Amendment', 'Article 199', 'Constitutional Validity of Statutes'],
    crossReferences: ['Article 175A', 'Article 191A', 'Article 199'],
    amendmentNotes: 'Inserted by the Constitution (Twenty-sixth Amendment) Act, 2024.'
  },
  {
    articleNumber: '204',
    title: 'Contempt of Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 4: General Provisions Relating to the Judicature',
    content: '(1) In this Article, "Court" means the Supreme Court or a High Court. (2) A Court shall have power to punish any person who: (a) abuses, interferes with or obstructs the process of the Court in any way or disobeys any order of the Court; (b) scandalizes the Court or otherwise does anything which tends to bring the Court or a Judge of the Court into hatred, ridicule or contempt; (c) does anything which tends to prejudice the determination of a matter pending before the Court; or (d) does any other thing which, by law, constitutes contempt of the Court.',
    explanation: 'Protects the dignity, authority, and coercive enforceability of superior court orders. Punishes civil and criminal contempt.',
    keyTopics: ['Contempt of Court', 'Disobedience of Injunctions', 'Scandalizing the Court', 'Contempt of Court Ordinance 2003'],
    crossReferences: ['Article 187', 'Article 199', 'Contempt of Court Ordinance 2003']
  },
  {
    articleNumber: '209',
    title: 'Supreme Judicial Council',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 4: General Provisions Relating to the Judicature',
    content: '(1) There shall be a Supreme Judicial Council of Pakistan consisting of the Chief Justice of Pakistan, the two next most senior Judges of the Supreme Court, and the two most senior Chief Justices of High Courts. (5) Inquires into misconduct or incapacity of superior court judges. Can recommend removal of a judge to the President.',
    explanation: 'Sole constitutional mechanism for accountability, inquiry into misconduct, and removal of superior court judges in Pakistan.',
    keyTopics: ['Supreme Judicial Council', 'SJC', 'Judicial Accountability', 'Judicial Misconduct', 'Code of Conduct'],
    crossReferences: ['Article 175', 'Article 195', 'Judges Code of Conduct']
  },
  {
    articleNumber: '212',
    title: 'Administrative Courts and Tribunals',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 4: General Provisions Relating to the Judicature',
    content: '(1) Notwithstanding anything hereinbefore contained, the appropriate Legislature may by Act provide for the establishment of one or more Administrative Courts or Tribunals to exercise exclusive jurisdiction in respect of: (a) matters relating to the terms and conditions of persons who are or have been in the service of Pakistan, including disciplinary matters; (b) matters relating to claims arising from tortious acts of Government; or (c) matters relating to the acquisition, administration and disposal of any property which is deemed to be enemy property. (2) Ouster of jurisdiction of other courts including High Courts under Article 199 in service matters covered by Service Tribunals.',
    explanation: 'Bar of jurisdiction under Article 212(2) preventing High Courts from entertaining civil servant service disputes where a statutory Service Tribunal possesses jurisdiction.',
    keyTopics: ['Service Tribunals', 'Ouster of Jurisdiction', 'Civil Servants', 'Terms and Conditions of Service'],
    crossReferences: ['Article 199', 'Service Tribunals Act 1973', 'Civil Servants Act 1973']
  },
  {
    articleNumber: '227',
    title: 'Provisions relating to the Holy Quran and Sunnah (Islamic Provisions)',
    part: 'Part IX: Islamic Provisions',
    content: '(1) All existing laws shall be brought in conformity with the Injunctions of Islam as laid down in the Holy Quran and Sunnah, in this part referred to as the Injunctions of Islam, and no law shall be enacted which is repugnant to such Injunctions. (2) Effect shall be given to the provisions of clause (1) only in the manner provided in this Part.',
    explanation: 'Requires all statutes to conform to Islamic injunctions and forbids repugnant enactments, adjudicated via the Federal Shariat Court (Chapter 3A).',
    keyTopics: ['Injunctions of Islam', 'Repugnancy to Islam', 'Federal Shariat Court', 'Islamic Provisions'],
    crossReferences: ['Article 2', 'Article 2A', 'Article 203D']
  },
  {
    articleNumber: '247',
    title: 'Administration of Tribal Areas (Historical / Post-25th Amendment Integration)',
    part: 'Part XII: Miscellaneous',
    chapter: 'Chapter 3: Tribal Areas',
    content: 'Omitted by the Constitution (Twenty-fifth Amendment) Act, 2018 (Act XXXVII of 2018). Formerly governed the Federally Administered Tribal Areas (FATA) and Provincially Administered Tribal Areas (PATA).',
    explanation: 'FATA was fully merged into Khyber Pakhtunkhwa province by the 25th Amendment, extending regular constitutional courts, Fundamental Rights, and laws across the merged tribal districts.',
    keyTopics: ['FATA Merger', '25th Amendment', 'Merged Districts', 'Tribal Areas Integration'],
    crossReferences: ['Article 1', 'Article 246'],
    amendmentNotes: 'Omitted by the Constitution (Twenty-fifth Amendment) Act, 2018.'
  }
];

const STATUTORY_RULES: RuleSeed[] = [
  // SUPREME COURT RULES, 1980
  {
    statuteCode: 'SCR_1980',
    statuteName: 'Supreme Court Rules, 1980',
    ruleNumber: 'Order XXV, Rule 1-6',
    title: 'Petitions for Enforcement of Fundamental Rights under Article 184(3)',
    category: 'Constitutional Writ & Original Jurisdiction',
    content: 'Every petition under Article 184(3) of the Constitution shall be signed by the petitioner or his Advocate-on-Record. The petition shall set out concisely the facts, the questions of public importance involved, and the specific Fundamental Rights alleged to have been infringed, accompanied by an affidavit verifying the facts. The petition shall be placed before the Court or Constitutional Bench for preliminary hearing.',
    courtType: 'Supreme Court of Pakistan',
    notes: 'Governs original public interest litigation procedures. Subject to 26th Amendment Constitutional Benches and Supreme Court Practice & Procedure Act 2023.',
    keyTopics: ['Order XXV', 'Article 184(3)', 'Advocate-on-Record', 'Affidavit', 'Public Importance'],
    crossReferences: ['Constitution Article 184(3)', 'Constitution Article 191A']
  },
  {
    statuteCode: 'SCR_1980',
    statuteName: 'Supreme Court Rules, 1980',
    ruleNumber: 'Order XXXIII, Rule 6',
    title: 'Inherent Powers of the Supreme Court',
    category: 'Inherent Powers',
    content: 'Nothing in these Rules shall be deemed to limit or otherwise affect the inherent powers of the Court to make such orders as may be necessary for the ends of justice or to prevent abuse of the process of the Court.',
    courtType: 'Supreme Court of Pakistan',
    notes: 'Parallel to Section 151 CPC and Section 561-A CrPC; enables Supreme Court to pass ad-interim orders and remedial directions.',
    keyTopics: ['Inherent Powers', 'Ends of Justice', 'Abuse of Process', 'Ad-interim Orders'],
    crossReferences: ['Constitution Article 187', 'CPC Section 151']
  },
  {
    statuteCode: 'SCR_1980',
    statuteName: 'Supreme Court Rules, 1980',
    ruleNumber: 'Order XXIII, Rule 1-8',
    title: 'Civil Petitions for Leave to Appeal (CPLA)',
    category: 'Appellate Procedure',
    content: 'A Civil Petition for Leave to Appeal shall be filed within thirty days from the date of the judgment, decree or final order of the High Court against which appeal is sought, or within sixty days where certificate was refused. The petition shall state succinctly the grounds on which leave is asked, question of law involved, and be accompanied by certified copies.',
    courtType: 'Supreme Court of Pakistan',
    notes: 'Strict limitation periods apply. Condonation of delay requires Section 5 Limitation Act proof of day-to-day sufficient cause.',
    keyTopics: ['CPLA', 'Leave to Appeal', 'Limitation 30 Days', 'Limitation Act Section 5'],
    crossReferences: ['Constitution Article 185(3)', 'Limitation Act 1908']
  },

  // HIGH COURT RULES AND ORDERS
  {
    statuteCode: 'HC_RULES',
    statuteName: 'High Court Rules and Orders (Lahore / Sindh / Peshawar / Balochistan)',
    ruleNumber: 'Volume V, Chapter 4-H',
    title: 'Procedure in Writ Petitions under Article 199',
    category: 'Writ Procedure',
    content: 'A petition for the issuance of a direction, order or writ under Article 199 of the Constitution shall be accompanied by an affidavit verifying the facts set forth in the petition. The petitioner must disclose whether any other writ petition or civil suit on the same subject-matter has been instituted or is pending. Where ad-interim stay or injunction is prayed for, notice to the Advocate-General or Standing Counsel for the Federation is mandatory before granting ex-parte orders affecting public revenues or public projects.',
    courtType: 'High Court',
    notes: 'Mandatory non-suppression requirement (clean hands doctrine). Proviso to Article 199(4) limits ex-parte stay against tax recovery to maximum six months.',
    keyTopics: ['Writ Procedure', 'Clean Hands Doctrine', 'Notice to Advocate-General', 'Interim Relief Limitation'],
    crossReferences: ['Constitution Article 199(4)', 'CPC Order 39']
  },
  {
    statuteCode: 'HC_RULES',
    statuteName: 'High Court Rules and Orders',
    ruleNumber: 'Volume V, Chapter 1-A',
    title: 'Presentation of Appeals and Petitions in the High Court',
    category: 'Pleadings & Registry Filing',
    content: 'Every memorandum of appeal, civil revision, or petition shall be presented to the Deputy Registrar (Judicial) within the hours prescribed. It shall be accompanied by certified copies of the impugned judgment, decree, and trial court orders, properly stamped with court fees under the Court Fees Act 1870.',
    courtType: 'High Court',
    notes: 'Registry objections must be removed within the period allowed by the Registrar, failing which the petition may be dismissed for non-prosecution.',
    keyTopics: ['Registry Filing', 'Certified Copies', 'Court Fees Act', 'Limitation'],
    crossReferences: ['Court Fees Act 1870', 'Suits Valuation Act 1887']
  },

  // CODE OF CIVIL PROCEDURE, 1908 (ACT V OF 1908)
  {
    statuteCode: 'CPC_1908',
    statuteName: 'Code of Civil Procedure, 1908',
    ruleNumber: 'Order XXXIX, Rule 1',
    title: 'Cases in which temporary injunction may be granted',
    category: 'Injunctions & Stay Orders',
    content: 'Where in any suit it is proved by affidavit or otherwise: (a) that any property in dispute in a suit is in danger of being wasted, damaged, or alienated by any party to the suit, or wrongfully sold in execution of a decree; or (b) that the defendant threatens, or intends, to remove or dispose of his property with a view to defraud his creditors, the Court may by order grant a temporary injunction to restrain such act, or make such other order for the purpose of staying and preventing the wasting, damaging, alienation, sale, removal or disposition of the property as the Court thinks fit, until the disposal of the suit or until further orders.',
    courtType: 'Civil Courts and Superior Courts (Civil Jurisdiction)',
    notes: 'Requires proof of three sine qua non ingredients: (1) Prima Facie Case, (2) Balance of Convenience, and (3) Irreparable Loss & Injury.',
    keyTopics: ['Order 39 Rule 1', 'Temporary Injunction', 'Prima Facie Case', 'Balance of Convenience', 'Irreparable Loss'],
    crossReferences: ['CPC Order XXXIX Rule 2', 'Specific Relief Act 1877 Section 53-54']
  },
  {
    statuteCode: 'CPC_1908',
    statuteName: 'Code of Civil Procedure, 1908',
    ruleNumber: 'Order XXXIX, Rule 2',
    title: 'Injunction to restrain repetition or continuance of breach',
    category: 'Injunctions & Stay Orders',
    content: '(1) In any suit for restraining the defendant from committing a breach of contract or other injury of any kind, whether compensation is claimed in the suit or not, the plaintiff may, at any time after the commencement of the suit, and either before or after judgment, apply to the Court for a temporary injunction to restrain the defendant from committing the breach of contract or injury complained of... (3) In case of disobedience, or of breach of any such terms, the Court granting an injunction may order the property of the person guilty of such disobedience or breach to be attached, and may also order such person to be detained in prison for a term not exceeding six months.',
    courtType: 'Civil Courts and Superior Courts',
    notes: 'Remedy for breach or disobedience of ad-interim injunctions. Contempt and civil detention powers of civil judges.',
    keyTopics: ['Order 39 Rule 2', 'Disobedience of Injunction', 'Attachment of Property', 'Civil Imprisonment'],
    crossReferences: ['CPC Order XXXIX Rule 1', 'Constitution Article 204']
  },
  {
    statuteCode: 'CPC_1908',
    statuteName: 'Code of Civil Procedure, 1908',
    ruleNumber: 'Order XLI, Rule 5',
    title: 'Stay by Appellate Court',
    category: 'Appellate Stay',
    content: '(1) An appeal shall not operate as a stay of proceedings under a decree or order appealed from except so far as the Appellate Court may order, nor shall execution of a decree be stayed by reason only of an appeal having been preferred against the decree; but the Appellate Court may for sufficient cause order stay of execution of such decree. (3) No order for stay of execution shall be made unless the Court is satisfied: (a) that substantial loss may result to the party applying for stay unless the order is made; (b) that the application has been made without unreasonable delay; and (c) that security has been given by the applicant for the due performance of such decree or order.',
    courtType: 'Appellate Civil Courts (District Court & High Court)',
    notes: 'Filing an appeal does not automatically freeze the decree. Substantial loss and security are mandatory prerequisites.',
    keyTopics: ['Order 41 Rule 5', 'Stay of Execution', 'Substantial Loss', 'Furnishing Security'],
    crossReferences: ['CPC Section 96', 'CPC Order XLI Rule 1']
  },
  {
    statuteCode: 'CPC_1908',
    statuteName: 'Code of Civil Procedure, 1908',
    ruleNumber: 'Section 115',
    title: 'Revision',
    category: 'Civil Revision',
    content: '(1) The High Court or District Court may call for the record of any case which has been decided by any Court subordinate to such High Court or District Court and in which no appeal lies thereto, and if such subordinate Court appears: (a) to have exercised a jurisdiction not vested in it by law; or (b) to have failed to exercise a jurisdiction so vested; or (c) to have acted in the exercise of its jurisdiction illegally or with material irregularity, the High Court or District Court may make such order in the case as it thinks fit.',
    courtType: 'High Court and District Court',
    notes: 'Corrects jurisdictional errors, illegalities, and material procedural defects where no appeal lies.',
    keyTopics: ['Section 115 CPC', 'Civil Revision', 'Jurisdictional Error', 'Material Irregularity'],
    crossReferences: ['CPC Section 96', 'CPC Section 100']
  },
  {
    statuteCode: 'CPC_1908',
    statuteName: 'Code of Civil Procedure, 1908',
    ruleNumber: 'Section 151',
    title: 'Saving of inherent powers of Court',
    category: 'Inherent Powers',
    content: 'Nothing in this Code shall be deemed to limit or otherwise affect the inherent power of the Court to make such orders as may be necessary for the ends of justice or to prevent abuse of the process of the Court.',
    courtType: 'All Civil Courts',
    notes: 'Residual power invoked to advance substantive justice and prevent technical procedural foreclosure where no explicit provision exists.',
    keyTopics: ['Section 151 CPC', 'Inherent Powers', 'Ends of Justice', 'Abuse of Process'],
    crossReferences: ['Order XXXIII Rule 6 SCR 1980', 'Section 561-A CrPC']
  },

  // CODE OF CRIMINAL PROCEDURE, 1898 (ACT V OF 1898)
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 497',
    title: 'When bail may be taken in case of non-bailable offence (Post-Arrest Bail)',
    category: 'Criminal Bail',
    content: '(1) When any person accused of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police station, or appears or is brought before a Court, he may be released on bail, but he shall not be so released if there appear reasonable grounds for believing that he has been guilty of an offence punishable with death or imprisonment for life or imprisonment for ten years (Prohibitory Clause): Provided that the Court may direct that any person under the age of sixteen years or any woman or any sick or infirm person accused of such an offence be released on bail: Provided further that statutory bail shall be granted where trial has not concluded within one year (non-capital) or two years (capital) through no fault of the accused. (2) If it appears to such officer or Court at any stage of the investigation, inquiry or trial, as the case may be, that there are not reasonable grounds for believing that the accused has committed a non-bailable offence, but that there are sufficient grounds for further inquiry into his guilt, the accused shall, pending such inquiry, be released on bail.',
    courtType: 'Magistrate, Sessions Court, High Court',
    notes: 'Post-arrest bail jurisprudence in Pakistan. Distinction between prohibitory and non-prohibitory clause; statutory delay proviso; further inquiry standard under subsection (2).',
    keyTopics: ['Section 497 CrPC', 'Post-Arrest Bail', 'Prohibitory Clause', 'Further Inquiry', 'Statutory Delay Bail', 'Women and Minors Proviso'],
    crossReferences: ['Section 498 CrPC', 'Constitution Article 9', 'Constitution Article 10']
  },
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 498',
    title: 'Power to direct admission to bail or reduction of bail (Pre-Arrest Bail)',
    category: 'Criminal Bail',
    content: 'The amount of every bond executed under this Chapter shall be fixed with due regard to the circumstances of the case, and shall not be excessive; and the High Court or Court of Session may, in any case, whether there be an appeal on conviction or not, direct that any person be admitted to bail, or that the bail required by a police officer or Magistrate be reduced.',
    courtType: 'High Court and Sessions Court',
    notes: 'Statutory basis for Anticipatory / Pre-Arrest Bail. Requires establishing: (1) Ulterior motives / mala fides on the part of police or complainant, (2) Apprehension of imminent arrest and humiliation, (3) Prima facie false implication.',
    keyTopics: ['Section 498 CrPC', 'Pre-Arrest Bail', 'Anticipatory Bail', 'Mala Fides', 'Humiliation Prevention'],
    crossReferences: ['Section 497 CrPC', 'Constitution Article 9', 'Constitution Article 14']
  },
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 491',
    title: 'Power to issue directions of the nature of a habeas corpus',
    category: 'Habeas Corpus & Unlawful Custody',
    content: '(1) Any High Court may, whenever it thinks fit, direct: (a) that a person within the limits of its appellate criminal jurisdiction be brought up before the Court to be dealt with according to law; (b) that a person illegally or improperly detained in public or private custody within such limits be set at liberty; (c) that a prisoner detained in any jail situated within such limits be brought before the Court to be there examined as a witness in any matter.',
    courtType: 'High Court and Sessions Court (delegated under Section 491(1A))',
    notes: 'Immediate judicial summary remedy against illegal police confinement, unlawful lockups, private bondage, and child custody disputes.',
    keyTopics: ['Section 491 CrPC', 'Habeas Corpus', 'Illegal Detention', 'Bailiff Recovery', 'Police Confinement'],
    crossReferences: ['Constitution Article 199(1)(b)(i)', 'Constitution Article 9', 'Constitution Article 10']
  },
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 561-A',
    title: 'Saving of inherent power of High Court',
    category: 'Criminal Quashment',
    content: 'Nothing in this Code shall be deemed to limit or affect the inherent power of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice.',
    courtType: 'High Court',
    notes: 'Power of the High Court to quash malicious FIRs, baseless criminal complaints, and vexatious proceedings where no criminal case is disclosed.',
    keyTopics: ['Section 561-A CrPC', 'Quashment of FIR', 'Abuse of Process', 'Ends of Justice', 'Malicious Prosecution'],
    crossReferences: ['CPC Section 151', 'Constitution Article 199', 'CrPC Section 249-A', 'CrPC Section 265-K']
  },
  {
    statuteCode: 'CRPC_1898',
    statuteName: 'Code of Criminal Procedure, 1898',
    ruleNumber: 'Section 154',
    title: 'Information in cognizable cases (First Information Report - FIR)',
    category: 'Criminal Investigation',
    content: 'Every information relating to the commission of a cognizable offence if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it, and the substance thereof shall be entered in a book to be kept by such officer in such form as the Provincial Government may prescribe in this behalf.',
    courtType: 'Police Station / Magistrate',
    notes: 'Statutory basis for registration of FIR. Police cannot refuse to register an FIR when cognizable offence is disclosed; remedy lies under Section 22-A / 22-B CrPC before Ex-Officio Justice of Peace.',
    keyTopics: ['Section 154 CrPC', 'FIR', 'Cognizable Offence', 'Police Duty', 'Justice of Peace 22-A'],
    crossReferences: ['CrPC Section 22-A', 'CrPC Section 156', 'Police Order 2002']
  },

  // QANUN-E-SHAHADAT ORDER, 1984 (PRESIDENTIAL ORDER NO. 10 OF 1984)
  {
    statuteCode: 'QSO_1984',
    statuteName: 'Qanun-e-Shahadat Order, 1984',
    ruleNumber: 'Article 2',
    title: 'Interpretation and Definitions (Fact, Relevant, Proved, Disproved)',
    category: 'Law of Evidence',
    content: 'Defines Court, Fact, Relevant Fact, Facts in Issue, Document, Evidence, Proved, Disproved, and Not Proved. A fact is said to be proved when, after considering the matters before it, the Court either believes it to exist, or considers its existence so probable that a prudent man ought, under the circumstances of the particular case, to act upon the supposition that it exists.',
    courtType: 'All Judicial and Quasi-Judicial Courts in Pakistan',
    notes: 'Standard of proof: preponderance of probabilities in civil proceedings; beyond reasonable doubt in criminal trials.',
    keyTopics: ['Article 2 QSO', 'Standard of Proof', 'Proved', 'Preponderance of Probabilities', 'Reasonable Doubt'],
    crossReferences: ['QSO Article 17', 'QSO Article 117']
  },
  {
    statuteCode: 'QSO_1984',
    statuteName: 'Qanun-e-Shahadat Order, 1984',
    ruleNumber: 'Article 70-74',
    title: 'Proof of Contents of Documents (Primary and Secondary Evidence)',
    category: 'Law of Evidence',
    content: 'Article 70: The contents of documents may be proved either by primary or by secondary evidence. Article 71: Primary evidence means the document itself produced for the inspection of the Court. Article 72: Documents must be proved by primary evidence except in the cases mentioned in Article 74 (where original is in possession of adverse party, lost, destroyed, or is a public document).',
    courtType: 'Civil and Criminal Courts',
    notes: 'Best Evidence Rule. Secondary evidence (photocopies) is inadmissible unless proper foundation under Article 74 is established through evidence.',
    keyTopics: ['Primary Evidence', 'Secondary Evidence', 'Best Evidence Rule', 'Article 71 QSO', 'Article 74 QSO'],
    crossReferences: ['QSO Article 75', 'QSO Article 85', 'QSO Article 87']
  },
  {
    statuteCode: 'QSO_1984',
    statuteName: 'Qanun-e-Shahadat Order, 1984',
    ruleNumber: 'Article 114',
    title: 'Estoppel',
    category: 'Law of Evidence',
    content: 'When one person has, by his declaration, act or omission, intentionally caused or permitted another person to believe a thing to be true and to act upon such belief, neither he nor his representative shall be allowed, in any suit or proceeding between himself and such person or his representative, to deny the truth of that thing.',
    courtType: 'Civil Courts and Superior Courts',
    notes: 'Rule of evidence precluding a party from resiling from representations where the opposing party has altered their position to their detriment.',
    keyTopics: ['Article 114 QSO', 'Estoppel', 'Promissory Estoppel', 'Representation', 'Detrimental Reliance'],
    crossReferences: ['Contract Act 1872 Section 2', 'Specific Relief Act 1877']
  },
  {
    statuteCode: 'QSO_1984',
    statuteName: 'Qanun-e-Shahadat Order, 1984',
    ruleNumber: 'Article 164',
    title: 'Production of evidence that has become available because of modern devices, etc.',
    category: 'Digital & Forensic Evidence',
    content: 'In such cases as the Court may consider appropriate, the Court may allow to be produced any evidence that may have become available because of modern devices or techniques, such as audio/video recordings, CCTV footage, phone call detail records (CDRs), digital logs, and biometric forensic analysis.',
    courtType: 'Civil and Criminal Courts',
    notes: 'Admissibility of electronic, digital, and forensic audio/video recordings subject to chain of custody and forensic authenticity verification.',
    keyTopics: ['Article 164 QSO', 'Digital Evidence', 'Audio Video Recording', 'CCTV Footage', 'Forensic Analysis', 'Chain of Custody'],
    crossReferences: ['Electronic Transactions Ordinance 2002', 'PECA 2016']
  },

  // SPECIFIC RELIEF ACT, 1877
  {
    statuteCode: 'SRA_1877',
    statuteName: 'Specific Relief Act, 1877',
    ruleNumber: 'Section 42',
    title: 'Discretion of Court as to declaration of status or right',
    category: 'Declaratory Suits',
    content: 'Any person entitled to any legal character, or to any right as to any property, may institute a suit against any person denying, or interested to deny, his title to such character or right, and the Court may in its discretion make therein a declaration that he is so entitled, and the plaintiff need not in such suit ask for any further relief: Provided that no Court shall make any such declaration where the plaintiff, being able to seek further relief than a mere declaration of title, omits to do so.',
    courtType: 'Civil Courts',
    notes: 'Governs suits for declaration of title, status, and legal rights. The proviso bars bare declaratory suits when consequential relief (e.g., possession or injunction) was available but not claimed.',
    keyTopics: ['Section 42 SRA', 'Declaratory Suit', 'Legal Character', 'Consequential Relief Bar'],
    crossReferences: ['Specific Relief Act 1877 Section 54', 'CPC Order VII Rule 11']
  },
  {
    statuteCode: 'SRA_1877',
    statuteName: 'Specific Relief Act, 1877',
    ruleNumber: 'Section 53-56',
    title: 'Preventive Relief: Perpetual and Mandatory Injunctions',
    category: 'Injunctions',
    content: 'Section 53: Preventive relief is granted at the discretion of the Court by injunction, temporary or perpetual. Section 54: Perpetual injunction may be granted to prevent the breach of an obligation existing in favor of the applicant... Section 55: Mandatory injunctions to compel performance of requisite acts. Section 56: When injunction cannot be granted (e.g., to stay judicial proceedings in superior court or restrain government departments from public duties).',
    courtType: 'Civil Courts and Superior Courts',
    notes: 'Substantive law governing grant or refusal of permanent and mandatory injunctions.',
    keyTopics: ['Perpetual Injunction', 'Mandatory Injunction', 'Section 54 SRA', 'Section 56 SRA Injunction Bar'],
    crossReferences: ['CPC Order XXXIX', 'Constitution Article 199']
  }
];

async function main() {
  console.log('Seeding Comprehensive 1973 Constitution Articles & Statutory Rules...');

  // 1. Seed Constitutional Articles
  let insertedArticles = 0;
  for (const art of CONSTITUTIONAL_ARTICLES) {
    await prisma.constitutionalArticle.upsert({
      where: { articleNumber: art.articleNumber },
      update: {
        title: art.title,
        part: art.part,
        chapter: art.chapter,
        content: art.content,
        explanation: art.explanation,
        keyTopics: art.keyTopics,
        crossReferences: art.crossReferences,
        amendmentNotes: art.amendmentNotes,
      },
      create: {
        articleNumber: art.articleNumber,
        title: art.title,
        part: art.part,
        chapter: art.chapter,
        content: art.content,
        explanation: art.explanation,
        keyTopics: art.keyTopics,
        crossReferences: art.crossReferences,
        amendmentNotes: art.amendmentNotes,
      },
    });
    insertedArticles++;
  }
  console.log(`Successfully seeded/updated ${insertedArticles} Constitutional Articles.`);

  // 2. Seed Statutory Rules & Regulations
  let insertedRules = 0;
  for (const rule of STATUTORY_RULES) {
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
    insertedRules++;
  }
  console.log(`Successfully seeded/updated ${insertedRules} Statutory Rules & Court Regulations.`);

  const totalArticles = await prisma.constitutionalArticle.count();
  const totalRules = await prisma.statutoryRule.count();
  console.log(`DB Verification: Total Articles = ${totalArticles}, Total Statutory Rules = ${totalRules}`);
}

main()
  .catch((e) => {
    console.error('Failed to seed constitution and rules:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
