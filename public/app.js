// Calculate ability modifier: floor((score - 10) / 2)
function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Skill to ability mapping
const skillAbilityMap = {
  'athletics': 'str',
  'acrobatics': 'dex',
  'sleight-of-hand': 'dex',
  'stealth': 'dex',
  'arcana': 'int',
  'history': 'int',
  'investigation': 'int',
  'nature': 'int',
  'religion': 'int',
  'animal-handling': 'wis',
  'insight': 'wis',
  'medicine': 'wis',
  'perception': 'wis',
  'survival': 'wis',
  'deception': 'cha',
  'intimidation': 'cha',
  'performance': 'cha',
  'persuasion': 'cha',
};

// State
let characters = [];
let currentCharacter = null;

// DOM Elements
const characterList = document.getElementById('character-list');
const newCharacterBtn = document.getElementById('new-character-btn');
const noCharacter = document.getElementById('no-character');
const characterSheet = document.getElementById('character-sheet');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');

// Ability score inputs
const abilityInputs = {
  str: document.getElementById('str-score'),
  dex: document.getElementById('dex-score'),
  con: document.getElementById('con-score'),
  int: document.getElementById('int-score'),
  wis: document.getElementById('wis-score'),
  cha: document.getElementById('cha-score'),
};

const modifierDisplays = {
  str: document.getElementById('str-mod'),
  dex: document.getElementById('dex-mod'),
  con: document.getElementById('con-mod'),
  int: document.getElementById('int-mod'),
  wis: document.getElementById('wis-mod'),
  cha: document.getElementById('cha-mod'),
};

// Saving throw elements
const saveProfCheckboxes = {
  str: document.getElementById('str-save-prof'),
  dex: document.getElementById('dex-save-prof'),
  con: document.getElementById('con-save-prof'),
  int: document.getElementById('int-save-prof'),
  wis: document.getElementById('wis-save-prof'),
  cha: document.getElementById('cha-save-prof'),
};

const saveValueDisplays = {
  str: document.getElementById('str-save'),
  dex: document.getElementById('dex-save'),
  con: document.getElementById('con-save'),
  int: document.getElementById('int-save'),
  wis: document.getElementById('wis-save'),
  cha: document.getElementById('cha-save'),
};

// API Functions
async function fetchCharacters() {
  const res = await fetch('/api/characters');
  characters = await res.json();
  renderCharacterList();
}

async function saveCharacter(character) {
  const res = await fetch('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(character),
  });
  return res.json();
}

async function deleteCharacter(id) {
  await fetch(`/api/characters/${id}`, { method: 'DELETE' });
}

// Render Functions
function renderCharacterList() {
  characterList.innerHTML = '';
  characters.forEach(char => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="char-name">${char.name || 'Unnamed'}</div>
      <div class="char-class">${char.class || 'No class'} ${char.level ? 'Lv.' + char.level : ''}</div>
    `;
    if (currentCharacter && currentCharacter.id === char.id) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => selectCharacter(char));
    characterList.appendChild(li);
  });
}

function selectCharacter(char) {
  currentCharacter = char;
  showCharacterSheet();
  populateForm(char);
  renderCharacterList();
}

function showCharacterSheet() {
  noCharacter.style.display = 'none';
  characterSheet.classList.remove('hidden');
}

function hideCharacterSheet() {
  noCharacter.style.display = 'flex';
  characterSheet.classList.add('hidden');
}

function populateForm(char) {
  // Basic info
  document.getElementById('char-name').value = char.name || '';
  document.getElementById('char-class').value = char.class || '';
  document.getElementById('char-subclass').value = char.subclass || '';
  document.getElementById('char-species').value = char.species || '';
  document.getElementById('char-background').value = char.background || '';
  
  // Level & XP
  document.getElementById('char-level').value = char.level || 1;
  document.getElementById('char-xp').value = char.xp || 0;
  
  // Combat stats
  document.getElementById('armor-class').value = char.armorClass || 10;
  document.getElementById('shield').value = char.shield || 0;
  document.getElementById('hp-current').value = char.hpCurrent || 0;
  document.getElementById('hp-temp').value = char.hpTemp || 0;
  document.getElementById('hp-level1').value = char.hpLevel1 || 0;
  document.getElementById('hp-per-level').value = char.hpPerLevel || 0;
  
  // Hit dice
  document.getElementById('hit-dice-spent').value = char.hitDiceSpent || 0;
  
  // Death saves
  document.getElementById('death-success-1').checked = char.deathSaves?.successes >= 1;
  document.getElementById('death-success-2').checked = char.deathSaves?.successes >= 2;
  document.getElementById('death-success-3').checked = char.deathSaves?.successes >= 3;
  document.getElementById('death-fail-1').checked = char.deathSaves?.failures >= 1;
  document.getElementById('death-fail-2').checked = char.deathSaves?.failures >= 2;
  document.getElementById('death-fail-3').checked = char.deathSaves?.failures >= 3;
  
  // Speed & Size
  document.getElementById('speed').value = char.speed || '30 ft';
  document.getElementById('size').value = char.size || 'Medium';
  
  // Heroic Inspiration
  document.getElementById('heroic-inspiration').checked = char.heroicInspiration || false;
  
  // Proficiency bonus
  document.getElementById('proficiency-bonus').value = char.proficiencyBonus || 2;
  
  // Ability scores
  abilityInputs.str.value = char.abilities?.strength || 10;
  abilityInputs.dex.value = char.abilities?.dexterity || 10;
  abilityInputs.con.value = char.abilities?.constitution || 10;
  abilityInputs.int.value = char.abilities?.intelligence || 10;
  abilityInputs.wis.value = char.abilities?.wisdom || 10;
  abilityInputs.cha.value = char.abilities?.charisma || 10;
  
  // Saving throw proficiencies
  saveProfCheckboxes.str.checked = char.saveProficiencies?.strength || false;
  saveProfCheckboxes.dex.checked = char.saveProficiencies?.dexterity || false;
  saveProfCheckboxes.con.checked = char.saveProficiencies?.constitution || false;
  saveProfCheckboxes.int.checked = char.saveProficiencies?.intelligence || false;
  saveProfCheckboxes.wis.checked = char.saveProficiencies?.wisdom || false;
  saveProfCheckboxes.cha.checked = char.saveProficiencies?.charisma || false;
  
  // Skill proficiencies
  Object.keys(skillAbilityMap).forEach(skill => {
    const checkbox = document.getElementById(`${skill}-prof`);
    if (checkbox) {
      checkbox.checked = char.skillProficiencies?.[skill] || false;
    }
  });
  
  // Equipment training
  document.getElementById('armor-light').checked = char.armorTraining?.light || false;
  document.getElementById('armor-medium').checked = char.armorTraining?.medium || false;
  document.getElementById('armor-heavy').checked = char.armorTraining?.heavy || false;
  document.getElementById('armor-shields').checked = char.armorTraining?.shields || false;
  document.getElementById('weapon-proficiencies').value = char.weaponProficiencies || '';
  document.getElementById('tool-proficiencies').value = char.toolProficiencies || '';
  
  updateAllCalculations();
}

function getFormData() {
  // Count death saves
  let deathSuccesses = 0;
  let deathFailures = 0;
  if (document.getElementById('death-success-1').checked) deathSuccesses++;
  if (document.getElementById('death-success-2').checked) deathSuccesses++;
  if (document.getElementById('death-success-3').checked) deathSuccesses++;
  if (document.getElementById('death-fail-1').checked) deathFailures++;
  if (document.getElementById('death-fail-2').checked) deathFailures++;
  if (document.getElementById('death-fail-3').checked) deathFailures++;
  
  // Collect skill proficiencies
  const skillProficiencies = {};
  Object.keys(skillAbilityMap).forEach(skill => {
    const checkbox = document.getElementById(`${skill}-prof`);
    if (checkbox) {
      skillProficiencies[skill] = checkbox.checked;
    }
  });
  
  return {
    id: currentCharacter?.id,
    name: document.getElementById('char-name').value,
    class: document.getElementById('char-class').value,
    subclass: document.getElementById('char-subclass').value,
    species: document.getElementById('char-species').value,
    background: document.getElementById('char-background').value,
    level: parseInt(document.getElementById('char-level').value) || 1,
    xp: parseInt(document.getElementById('char-xp').value) || 0,
    armorClass: parseInt(document.getElementById('armor-class').value) || 10,
    shield: parseInt(document.getElementById('shield').value) || 0,
    hpCurrent: parseInt(document.getElementById('hp-current').value) || 0,
    hpTemp: parseInt(document.getElementById('hp-temp').value) || 0,
    hpLevel1: parseInt(document.getElementById('hp-level1').value) || 0,
    hpPerLevel: parseInt(document.getElementById('hp-per-level').value) || 0,
    hitDiceSpent: parseInt(document.getElementById('hit-dice-spent').value) || 0,
    deathSaves: { successes: deathSuccesses, failures: deathFailures },
    speed: document.getElementById('speed').value,
    size: document.getElementById('size').value,
    heroicInspiration: document.getElementById('heroic-inspiration').checked,
    proficiencyBonus: parseInt(document.getElementById('proficiency-bonus').value) || 2,
    abilities: {
      strength: parseInt(abilityInputs.str.value) || 10,
      dexterity: parseInt(abilityInputs.dex.value) || 10,
      constitution: parseInt(abilityInputs.con.value) || 10,
      intelligence: parseInt(abilityInputs.int.value) || 10,
      wisdom: parseInt(abilityInputs.wis.value) || 10,
      charisma: parseInt(abilityInputs.cha.value) || 10,
    },
    saveProficiencies: {
      strength: saveProfCheckboxes.str.checked,
      dexterity: saveProfCheckboxes.dex.checked,
      constitution: saveProfCheckboxes.con.checked,
      intelligence: saveProfCheckboxes.int.checked,
      wisdom: saveProfCheckboxes.wis.checked,
      charisma: saveProfCheckboxes.cha.checked,
    },
    skillProficiencies,
    armorTraining: {
      light: document.getElementById('armor-light').checked,
      medium: document.getElementById('armor-medium').checked,
      heavy: document.getElementById('armor-heavy').checked,
      shields: document.getElementById('armor-shields').checked,
    },
    weaponProficiencies: document.getElementById('weapon-proficiencies').value,
    toolProficiencies: document.getElementById('tool-proficiencies').value,
  };
}

function updateModifier(ability) {
  const score = parseInt(abilityInputs[ability].value) || 10;
  const mod = calculateModifier(score);
  modifierDisplays[ability].textContent = formatModifier(mod);
  return mod;
}

function updateSavingThrow(ability) {
  const mod = calculateModifier(parseInt(abilityInputs[ability].value) || 10);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  const isProficient = saveProfCheckboxes[ability].checked;
  const total = mod + (isProficient ? profBonus : 0);
  saveValueDisplays[ability].textContent = formatModifier(total);
}

function updateSkill(skill) {
  const ability = skillAbilityMap[skill];
  const mod = calculateModifier(parseInt(abilityInputs[ability].value) || 10);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  const checkbox = document.getElementById(`${skill}-prof`);
  const valueDisplay = document.getElementById(`${skill}-val`);
  if (checkbox && valueDisplay) {
    const isProficient = checkbox.checked;
    const total = mod + (isProficient ? profBonus : 0);
    valueDisplay.textContent = formatModifier(total);
  }
}

function updateInitiative() {
  const dexMod = calculateModifier(parseInt(abilityInputs.dex.value) || 10);
  document.getElementById('initiative').textContent = formatModifier(dexMod);
}

function updatePassivePerception() {
  const wisMod = calculateModifier(parseInt(abilityInputs.wis.value) || 10);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  const perceptionProf = document.getElementById('perception-prof');
  const isProficient = perceptionProf ? perceptionProf.checked : false;
  const total = 10 + wisMod + (isProficient ? profBonus : 0);
  document.getElementById('passive-perception').textContent = total;
}

function updateHp() {
  const level = parseInt(document.getElementById('char-level').value) || 1;
  const hpLevel1 = parseInt(document.getElementById('hp-level1').value) || 0;
  const hpPerLevel = parseInt(document.getElementById('hp-per-level').value) || 0;
  const conMod = calculateModifier(parseInt(abilityInputs.con.value) || 10);
  
  // Max HP = Level 1 HP + (Per Level HP * (level - 1)) + (CON mod * level)
  const maxHp = hpLevel1 + (hpPerLevel * (level - 1)) + (conMod * level);
  document.getElementById('hp-max').value = Math.max(0, maxHp);
}

function updateHitDice() {
  const level = parseInt(document.getElementById('char-level').value) || 1;
  document.getElementById('hit-dice-max').value = level;
}

function updateAllCalculations() {
  // Update all modifiers
  Object.keys(abilityInputs).forEach(updateModifier);
  
  // Update all saving throws
  Object.keys(saveProfCheckboxes).forEach(updateSavingThrow);
  
  // Update all skills
  Object.keys(skillAbilityMap).forEach(updateSkill);
  
  // Update derived stats
  updateInitiative();
  updatePassivePerception();
  updateHp();
  updateHitDice();
}

// Event Listeners
newCharacterBtn.addEventListener('click', () => {
  currentCharacter = { id: null };
  showCharacterSheet();
  populateForm({});
  renderCharacterList();
});

saveBtn.addEventListener('click', async () => {
  const data = getFormData();
  const saved = await saveCharacter(data);
  currentCharacter = saved;
  await fetchCharacters();
  selectCharacter(saved);
});

deleteBtn.addEventListener('click', async () => {
  if (!currentCharacter?.id) return;
  if (!confirm('Delete this character?')) return;
  
  await deleteCharacter(currentCharacter.id);
  currentCharacter = null;
  hideCharacterSheet();
  await fetchCharacters();
});

// Ability score changes
Object.keys(abilityInputs).forEach(ability => {
  abilityInputs[ability].addEventListener('input', updateAllCalculations);
});

// Saving throw proficiency changes
Object.keys(saveProfCheckboxes).forEach(ability => {
  saveProfCheckboxes[ability].addEventListener('change', () => updateSavingThrow(ability));
});

// Skill proficiency changes
Object.keys(skillAbilityMap).forEach(skill => {
  const checkbox = document.getElementById(`${skill}-prof`);
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      updateSkill(skill);
      if (skill === 'perception') {
        updatePassivePerception();
      }
    });
  }
});

// Proficiency bonus changes
document.getElementById('proficiency-bonus').addEventListener('input', updateAllCalculations);

// Level changes
document.getElementById('char-level').addEventListener('input', () => {
  updateHp();
  updateHitDice();
});

// HP formula changes
document.getElementById('hp-level1').addEventListener('input', updateHp);
document.getElementById('hp-per-level').addEventListener('input', updateHp);

// Initialize
fetchCharacters();
