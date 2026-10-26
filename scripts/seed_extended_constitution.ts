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

const EXTENDED_ARTICLES: ArticleSeed[] = [
  // PART I
  {
    articleNumber: '3',
    title: 'Elimination of exploitation',
    part: 'Part I: Introductory',
    content: 'The State shall ensure the elimination of all forms of exploitation and the gradual fulfilment of the fundamental principle, from each according to his ability to each according to his work.',
    explanation: 'Basic socioeconomic objective of Pakistan prohibiting economic exploitation, bonded servitude, and unfair labor practices.',
    keyTopics: ['Elimination of Exploitation', 'Social Justice', 'Economic Rights'],
    crossReferences: ['Article 9', 'Article 11', 'Article 38']
  },
  // PART II - PRINCIPLES OF POLICY
  {
    articleNumber: '29',
    title: 'Principles of Policy',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 2: Principles of Policy',
    content: '(1) The Principles set out in this Chapter shall be known as the Principles of Policy, and it is the responsibility of each organ and authority of the State, and of each person performing functions on behalf of an organ or authority of the State, to act in accordance with those Principles in so far as they relate to the functions of the organ or authority.',
    explanation: 'Constitutional directory principles guiding statutory enactment and state governance.',
    keyTopics: ['Principles of Policy', 'State Responsibility', 'Directive Principles'],
    crossReferences: ['Article 30', 'Article 37', 'Article 38']
  },
  {
    articleNumber: '37',
    title: 'Promotion of social justice and eradication of social evils',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 2: Principles of Policy',
    content: 'The State shall: (a) promote, with special care, the educational and economic interests of backward classes or areas; (b) remove illiteracy and provide free and compulsory secondary education; (c) make technical and professional education generally available; (d) ensure inexpensive and expeditious justice; (e) make provision for securing just and humane conditions of work, maternity benefits for women; (f) enable people of different areas to participate in national activities.',
    explanation: 'Constitutional mandate for inexpensive and expeditious justice, legal aid, social security, and labor safeguards.',
    keyTopics: ['Expeditious Justice', 'Inexpensive Justice', 'Social Justice', 'Maternity Benefits'],
    crossReferences: ['Article 4', 'Article 10A', 'Article 25', 'Article 38']
  },
  {
    articleNumber: '38',
    title: 'Promotion of social and economic well-being of the people',
    part: 'Part II: Fundamental Rights and Principles of Policy',
    chapter: 'Chapter 2: Principles of Policy',
    content: 'The State shall: (a) secure the well-being of the people by raising their standard of living; (b) provide for all citizens, within the available resources of the country, facilities for work and adequate livelihood; (c) provide for all persons in the service of Pakistan or otherwise, social security by compulsory social insurance or other means; (d) provide basic necessities of life, such as food, clothing, housing, education and medical relief, for all such citizens, irrespective of sex, caste, creed or race, who are permanently or temporarily unable to earn their livelihood; (e) reduce disparity in the income and earnings of individuals; (f) eliminate riba as early as possible.',
    explanation: 'Welfare state foundation of Pakistan, social security, elimination of usury/riba, and universal access to basic necessities.',
    keyTopics: ['Social Security', 'Basic Necessities', 'Welfare State', 'Elimination of Riba'],
    crossReferences: ['Article 9', 'Article 25', 'Article 203D']
  },
  // PART III - PARLIAMENT & EXECUTIVE
  {
    articleNumber: '58',
    title: 'Dissolution of the National Assembly',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) The President shall dissolve the National Assembly if so advised by the Prime Minister; and the National Assembly shall, unless sooner dissolved, stand dissolved at the expiration of forty-eight hours after the Prime Minister has so advised. (2) Notwithstanding anything contained in clause (2) of Article 48, the President may also dissolve the National Assembly in his discretion where, in his opinion, having occurred a vote of no-confidence, no other member of the National Assembly commands the confidence of the majority.',
    explanation: 'Governs dissolution of National Assembly. Historic Article 58(2)(b) discretionary dissolution power was permanently repealed by the 18th Constitutional Amendment (2010).',
    keyTopics: ['Dissolution of Parliament', 'Prime Minister Advice', '48 Hours Clause', '18th Amendment Repeal of 58(2)(b)'],
    crossReferences: ['Article 48', 'Article 91', 'Article 92'],
    amendmentNotes: 'Article 58(2)(b) removed by the Constitution (Eighteenth Amendment) Act, 2010.'
  },
  {
    articleNumber: '62',
    title: 'Qualifications for membership of Majlis-e-Shoora (Parliament)',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) A person shall not be qualified to be elected or chosen as a member of Majlis-e-Shoora (Parliament) unless: (a) he is a citizen of Pakistan; (b) he is, in the case of National Assembly, not less than twenty-five years of age; (d) he is of good character and is not commonly known as one who violates Islamic Injunctions; (e) he has adequate knowledge of Islamic teachings...; (f) he is sagacious, righteous and non-profligate, honest and ameen, there being no declaration to the contrary by a court of law; (g) he has not worked against the integrity of the country or opposed the ideology of Pakistan.',
    explanation: 'Strict moral and statutory criteria for parliamentary candidates. Article 62(1)(f) ("honest and ameen") was the subject of landmark Supreme Court rulings (Sami Ullah Baloch case; Supreme Court Practice & Procedure Act interpretation).',
    keyTopics: ['Qualifications for Parliament', 'Article 62(1)(f)', 'Sadiq and Ameen', 'Electoral Disqualifications'],
    crossReferences: ['Article 63', 'Article 63A', 'Elections Act 2017 Section 232']
  },
  {
    articleNumber: '63',
    title: 'Disqualifications for membership of Majlis-e-Shoora (Parliament)',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) A person shall be disqualified from being elected or chosen as, and from being, a member of the Majlis-e-Shoora (Parliament), if: (a) he is of unsound mind; (b) he is an undischarged insolvent; (c) he ceases to be a citizen of Pakistan, or acquires the citizenship of a foreign State; (d) he holds an office of profit in the service of Pakistan; (g) he has been convicted by a court of competent jurisdiction on a charge of corrupt practice, moral turpitude, or loan default.',
    explanation: 'Comprehensive list of statutory and legal grounds disabling individuals from holding parliamentary office.',
    keyTopics: ['Disqualifications', 'Dual Citizenship', 'Office of Profit', 'Conviction for Moral Turpitude', 'Loan Default'],
    crossReferences: ['Article 62', 'Article 63A', 'Elections Act 2017']
  },
  {
    articleNumber: '63A',
    title: 'Disqualification on grounds of defection, etc.',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: '(1) If a member of a Parliamentary Party composed of a single political party in a House: (a) resigns from membership of his political party or joins another Parliamentary Party; or (b) votes or abstains from voting in the House contrary to any direction issued by the Parliamentary Party to which he belongs, in relation to: (i) election of the Prime Minister or the Chief Minister; or (ii) a vote of confidence or a vote of no-confidence; or (iii) a Money Bill or a Constitution (Amendment) Bill; he may be declared in writing by the Party Head to have defected from the political party, and his seat shall become vacant.',
    explanation: 'Anti-defection clause preventing floor-crossing in prime ministerial votes, no-confidence motions, Money Bills, and constitutional amendments. Interpretation clarified by Supreme Court review judgment.',
    keyTopics: ['Defection Clause', 'Anti-Floor Crossing', 'Party Discipline', 'Vote of No-Confidence', 'Supreme Court Interpretation'],
    crossReferences: ['Article 62', 'Article 63', 'Article 91']
  },
  {
    articleNumber: '77',
    title: 'Tax to be levied by law only',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 2: Majlis-e-Shoora (Parliament)',
    content: 'No tax shall be levied for the purposes of the Federation except by or under the authority of Act of Majlis-e-Shoora (Parliament).',
    explanation: 'Fundamental constitutional protection against taxation by executive notification (SRO) without explicit statutory primary authority (landmark Engineer-in-Chief case, PLD 2016 SC 808).',
    keyTopics: ['Taxation by Law Only', 'No Tax Without Representation', 'Statutory Authority', 'SRO Challenges'],
    crossReferences: ['Article 73', 'Article 199', 'Income Tax Ordinance 2001', 'Sales Tax Act 1990']
  },
  {
    articleNumber: '91',
    title: 'The Cabinet',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 3: The Federal Government',
    content: '(1) There shall be a Cabinet of Ministers, with the Prime Minister at its head, to aid and advise the President in the exercise of his functions. (2) The National Assembly shall meet on the twenty-first day following the day on which a general election to the Assembly is held... to elect the Prime Minister. (4) The Prime Minister shall be elected by the votes of the majority of the total membership of the National Assembly. (6) The Cabinet, together with the Ministers of State, shall be collectively responsible to the Senate and the National Assembly.',
    explanation: 'Structure of the Federal Cabinet and collective ministerial responsibility to Parliament.',
    keyTopics: ['The Cabinet', 'Prime Minister Election', 'Collective Responsibility', 'Parliamentary Democracy'],
    crossReferences: ['Article 48', 'Article 90', 'Article 92']
  },
  {
    articleNumber: '100',
    title: 'Attorney-General for Pakistan',
    part: 'Part III: The Federation of Pakistan',
    chapter: 'Chapter 3: The Federal Government',
    content: '(1) The President shall appoint a person, being a person qualified to be appointed a Judge of the Supreme Court, to be the Attorney-General for Pakistan. (2) It shall be the duty of the Attorney-General to give advice to the Federal Government upon such legal matters, and to perform such other duties of a legal character, as may be referred or assigned to him by the Federal Government, and in the performance of his duties he shall have the right of audience in all courts and tribunals in Pakistan.',
    explanation: 'Chief legal adviser to the Federal Government with supreme right of audience across all courts in Pakistan.',
    keyTopics: ['Attorney-General for Pakistan', 'Right of Audience', 'Legal Adviser to Federation'],
    crossReferences: ['Article 140', 'Article 177', 'CPC Order XXVII-A']
  },
  // PART IV - PROVINCES
  {
    articleNumber: '105',
    title: 'Governor to act on advice, etc.',
    part: 'Part IV: The Provinces',
    chapter: 'Chapter 1: The Governors',
    content: '(1) Subject to Constitution, in the performance of his functions, the Governor shall act on and in accordance with the advice of the Cabinet, or the Chief Minister: Provided that the Governor may require the Cabinet or the Chief Minister to reconsider such advice... (2) The Governor shall act in his discretion in respect of any matter in respect of which he is empowered by the Constitution to do so.',
    explanation: 'Provincial mirror to Article 48. Provincial Governor is bound by the binding advice of the Chief Minister and Provincial Cabinet.',
    keyTopics: ['Governor of Province', 'Binding Advice of Chief Minister', 'Provincial Cabinet'],
    crossReferences: ['Article 48', 'Article 112', 'Article 130']
  },
  {
    articleNumber: '112',
    title: 'Dissolution of Provincial Assembly',
    part: 'Part IV: The Provinces',
    chapter: 'Chapter 2: Provincial Assemblies',
    content: '(1) The Governor shall dissolve the Provincial Assembly if so advised by the Chief Minister; and the Provincial Assembly shall, unless sooner dissolved, stand dissolved at the expiration of forty-eight hours after the Chief Minister has so advised. (2) The Governor may also dissolve the Provincial Assembly in his discretion where a vote of no-confidence having been passed against the Chief Minister, no other member commands the confidence of the majority.',
    explanation: 'Procedure for dissolution of Provincial Assemblies upon Chief Minister advice.',
    keyTopics: ['Dissolution of Provincial Assembly', 'Chief Minister Advice', '48 Hours Rule'],
    crossReferences: ['Article 58', 'Article 105', 'Article 130']
  },
  {
    articleNumber: '140A',
    title: 'Local Government',
    part: 'Part IV: The Provinces',
    chapter: 'Chapter 4: General',
    content: '(1) Each Province shall, by law, establish a local government system and devolve political, administrative and financial responsibility and authority to the elected representatives of the local governments. (2) Elections to the local governments shall be held by the Election Commission of Pakistan.',
    explanation: 'Constitutional guarantee of local government tier, political/financial devolution, and supervision by the Election Commission of Pakistan.',
    keyTopics: ['Local Government', 'Devolution of Power', 'Elections Commission of Pakistan', 'Third Tier of Democracy'],
    crossReferences: ['Article 32', 'Article 219'],
    amendmentNotes: 'Substituted by the Constitution (Eighteenth Amendment) Act, 2010.'
  },
  // PART VII - THE JUDICATURE
  {
    articleNumber: '186',
    title: 'Advisory Jurisdiction of Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: '(1) If, at any time, the President considers that it is desirable to obtain the opinion of the Supreme Court on any question of law which he considers of public importance, he may refer the question to the Supreme Court for consideration. (2) The Supreme Court shall consider a question so referred and report its opinion on the question to the President.',
    explanation: 'Presidential reference seeking binding legal opinion of the Supreme Court on vital public questions of law (e.g., Zulfikar Ali Bhutto Reference, Reko Diq Reference).',
    keyTopics: ['Advisory Jurisdiction', 'Presidential Reference', 'Question of Public Importance', 'Article 186'],
    crossReferences: ['Article 184', 'Article 191A']
  },
  {
    articleNumber: '188',
    title: 'Review of judgments of Supreme Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 2: The Supreme Court of Pakistan',
    content: 'The Supreme Court shall have power, subject to the provisions of any Act of Majlis-e-Shoora (Parliament) and of any rules made by the Supreme Court, to review any judgment pronounced or any order made by it.',
    explanation: 'Empowers the Supreme Court to review its own judgments for discovery of new vital matter, errors apparent on the face of the record, or prevention of miscarriage of justice.',
    keyTopics: ['Review Jurisdiction', 'Article 188', 'Error Apparent on Record', 'Supreme Court Rules 1980 Order XXVI'],
    crossReferences: ['Article 187', 'Supreme Court Rules 1980 Order XXVI']
  },
  {
    articleNumber: '203D',
    title: 'Powers, jurisdiction and functions of the Federal Shariat Court',
    part: 'Part VII: The Judicature',
    chapter: 'Chapter 3A: Federal Shariat Court',
    content: '(1) The Court may, either of its own motion or on the petition of a citizen of Pakistan or the Federal Government or a Provincial Government, examine and decide the question whether or not any law or provision of law is repugnant to the Injunctions of Islam, as laid down in the Holy Quran and Sunnah of the Holy Prophet. (2) If the Court decides that any law or provision of law is repugnant, it shall cease to have effect on the date on which the decision of the Court takes effect.',
    explanation: 'Exclusive jurisdiction of the Federal Shariat Court and Shariat Appellate Bench of Supreme Court to strike down laws repugnant to Islam (excluding Constitution, Muslim Personal Law, and Fiscal/Tax laws during specified transitional periods).',
    keyTopics: ['Federal Shariat Court', 'Repugnancy to Islam', 'Shariat Appellate Bench', 'Article 203D'],
    crossReferences: ['Article 227', 'Article 2A']
  },
  // PART XI - AMENDMENT OF CONSTITUTION
  {
    articleNumber: '238',
    title: 'Amendment of Constitution',
    part: 'Part XI: Amendment of Constitution',
    content: 'Subject to this Part, the Constitution may be amended by Act of Majlis-e-Shoora (Parliament).',
    explanation: 'Constitutional amendment mechanism vesting power solely in Parliament.',
    keyTopics: ['Constitutional Amendment', 'Parliamentary Sovereignty'],
    crossReferences: ['Article 239']
  },
  {
    articleNumber: '239',
    title: 'Constitution Amendment Bill',
    part: 'Part XI: Amendment of Constitution',
    content: '(1) A Bill to amend the Constitution may originate in either House and, when the Bill has been passed by the votes of not less than two-thirds of the total membership of the House, it shall be transmitted to the other House. (2) If passed by two-thirds of the other House, it shall be presented to the President for assent. (5) No amendment of the Constitution shall be called in question in any court on any ground whatsoever. (6) For the removal of doubt, it is hereby declared that there is no limitation whatever on the power of the Majlis-e-Shoora (Parliament) to amend any of the provisions of the Constitution.',
    explanation: 'Mandates a two-thirds supermajority in both National Assembly and Senate for constitutional amendments. Under Basic Structure jurisprudence, Supreme Court historically examined procedural compliance.',
    keyTopics: ['Two-Thirds Majority', 'Constitutional Amendment', 'Basic Structure Doctrine', 'Article 239'],
    crossReferences: ['Article 238', 'Article 199', 'Article 184']
  },
  // PART XII - MISCELLANEOUS
  {
    articleNumber: '245',
    title: 'Functions of Armed Forces',
    part: 'Part XII: Miscellaneous',
    chapter: 'Chapter 2: Armed Forces',
    content: '(1) The Armed Forces shall, under the directions of the Federal Government, defend Pakistan against external aggression or threat of war, and, subject to law, act in aid of civil power when called upon to do so. (2) The validity of any direction issued by the Federal Government under clause (1) shall not be called in question in any court. (3) A High Court shall not exercise any jurisdiction under Article 199 in relation to any area in which the Armed Forces of Pakistan are, for the time being, acting in aid of civil power in pursuance of Article 245.',
    explanation: 'Defines the constitutional role of the Armed Forces in national defense and acting in aid of civil power under civilian executive command.',
    keyTopics: ['Armed Forces', 'Aid of Civil Power', 'External Aggression', 'Article 245 Invocations'],
    crossReferences: ['Article 243', 'Article 244', 'CrPC Section 130-131']
  },
  {
    articleNumber: '248',
    title: 'Protection to President, Governor, Minister, etc.',
    part: 'Part XII: Miscellaneous',
    chapter: 'Chapter 4: General',
    content: '(1) The President, a Governor, the Prime Minister, a Federal Minister, a Minister of State, the Chief Minister and a Provincial Minister shall not be answerable to any court for the exercise of powers and performance of functions of their respective offices or for any act done or purporting to be done in the exercise of those powers and performance of those functions: Provided that nothing in this clause shall be construed as restricting the right of any person to bring appropriate proceedings against the Federation or a Province. (2) No criminal proceedings whatsoever shall be instituted or continued against the President or a Governor in any court during his term of office.',
    explanation: 'Official immunity for executive heads of state and ministers for official constitutional actions, with complete criminal immunity for sitting President and Governors.',
    keyTopics: ['Official Immunity', 'Presidential Immunity', 'Gubernatorial Immunity', 'Article 248'],
    crossReferences: ['Article 41', 'Article 101', 'Article 90', 'Article 129']
  }
];

async function main() {
  console.log('Seeding extended constitutional articles...');
  let count = 0;
  for (const art of EXTENDED_ARTICLES) {
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
    count++;
  }
  console.log(`Successfully upserted ${count} extended articles.`);
  const total = await prisma.constitutionalArticle.count();
  console.log(`Current Total Constitutional Articles in DB: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
