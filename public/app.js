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
let savedSnapshot = null;  // JSON snapshot of last saved state for dirty checking
let pendingNavigation = null;  // Function to invoke after handling unsaved changes

// DOM Elements
const characterList = document.getElementById('character-list');
const newCharacterBtn = document.getElementById('new-character-btn');
const noCharacter = document.getElementById('no-character');
const characterSheet = document.getElementById('character-sheet');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const duplicateBtn = document.getElementById('duplicate-btn');

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
  if (hasUnsavedChanges()) {
    pendingNavigation = () => doSelectCharacter(char);
    document.getElementById('unsaved-changes-modal').classList.add('active');
    return;
  }
  doSelectCharacter(char);
}

function doSelectCharacter(char) {
  currentCharacter = char;
  showCharacterSheet();
  populateForm(char);
  renderCharacterList();
  updateSavedSnapshot();
}

function hasUnsavedChanges() {
  if (!currentCharacter || !characterSheet || characterSheet.classList.contains('hidden')) return false;
  if (savedSnapshot === null) return false;
  try {
    const current = JSON.stringify(getFormData());
    return current !== savedSnapshot;
  } catch (e) {
    return false;
  }
}

function updateSavedSnapshot() {
  try {
    savedSnapshot = JSON.stringify(getFormData());
  } catch (e) {
    savedSnapshot = null;
  }
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
  document.getElementById('shield-equipped').checked = char.shieldEquipped || false;
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
  
  // Skill proficiencies (3-state: 0=none, 1=proficient, 2=expertise)
  Object.keys(skillAbilityMap).forEach(skill => {
    const toggle = document.getElementById(`${skill}-prof`);
    if (toggle) {
      const state = char.skillProficiencies?.[skill] || 0;
      toggle.classList.remove('proficient', 'expertise');
      if (state === 1) {
        toggle.classList.add('proficient');
      } else if (state === 2) {
        toggle.classList.add('expertise');
      }
    }
  });
  
  // Equipment training
  document.getElementById('armor-light').checked = char.armorTraining?.light || false;
  document.getElementById('armor-medium').checked = char.armorTraining?.medium || false;
  document.getElementById('armor-heavy').checked = char.armorTraining?.heavy || false;
  document.getElementById('armor-shields').checked = char.armorTraining?.shields || false;
  document.getElementById('weapon-proficiencies').value = char.weaponProficiencies || '';
  document.getElementById('tool-proficiencies').value = char.toolProficiencies || '';
  
  // Combat Actions
  renderCombatActions(char.combatActions || []);
  
  // Class Features
  renderDraggableItems('class-features-content', char.classFeatures || [], 'classFeatures');
  
  // Species Traits
  renderDraggableItems('species-traits-content', char.speciesTraits || [], 'speciesTraits');
  
  // Feats
  renderDraggableItems('feats-content', char.feats || [], 'feats');
  
  // Languages
  renderSimpleItems('languages-content', char.languages || [], 'languages');
  
  // Resistances
  renderSimpleItems('resistances-content', char.resistances || [], 'resistances');
  
  // Equipment
  renderDraggableItems('equipment-content', char.equipment || [], 'equipment');
  
  // Spellcasting Ability
  document.querySelectorAll('.spell-ability-btn').forEach(btn => btn.classList.remove('selected'));
  if (char.spellcastingAbility) {
    const btn = document.querySelector(`.spell-ability-btn[data-ability="${char.spellcastingAbility}"]`);
    if (btn) btn.classList.add('selected');
  }
  
  // Spell Slots
  initSpellSlots();
  
  // Restore feature box order
  restoreFeatureBoxOrder();
  
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
  
  // Collect skill proficiencies (3-state: 0=none, 1=proficient, 2=expertise)
  const skillProficiencies = {};
  Object.keys(skillAbilityMap).forEach(skill => {
    const toggle = document.getElementById(`${skill}-prof`);
    if (toggle) {
      if (toggle.classList.contains('expertise')) {
        skillProficiencies[skill] = 2;
      } else if (toggle.classList.contains('proficient')) {
        skillProficiencies[skill] = 1;
      } else {
        skillProficiencies[skill] = 0;
      }
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
    shieldEquipped: document.getElementById('shield-equipped').checked,
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
    combatActions: currentCharacter?.combatActions || [],
    classFeatures: currentCharacter?.classFeatures || [],
    speciesTraits: currentCharacter?.speciesTraits || [],
    feats: currentCharacter?.feats || [],
    languages: currentCharacter?.languages || [],
    resistances: currentCharacter?.resistances || [],
    equipment: currentCharacter?.equipment || [],
    spellcastingAbility: currentCharacter?.spellcastingAbility || null,
    spellSlots: currentCharacter?.spellSlots || {},
    featureBoxOrder: currentCharacter?.featureBoxOrder || null,
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

function getSkillProficiencyState(skill) {
  const toggle = document.getElementById(`${skill}-prof`);
  if (!toggle) return 0;
  if (toggle.classList.contains('expertise')) return 2;
  if (toggle.classList.contains('proficient')) return 1;
  return 0;
}

function updateSkill(skill) {
  const ability = skillAbilityMap[skill];
  const mod = calculateModifier(parseInt(abilityInputs[ability].value) || 10);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  const valueDisplay = document.getElementById(`${skill}-val`);
  const state = getSkillProficiencyState(skill);
  
  if (valueDisplay) {
    let total = mod;
    if (state === 1) {
      total += profBonus; // Proficient
    } else if (state === 2) {
      total += profBonus * 2; // Expertise
    }
    valueDisplay.textContent = formatModifier(total);
  }
}

function cycleSkillProficiency(skill) {
  const toggle = document.getElementById(`${skill}-prof`);
  if (!toggle) return;
  
  // Cycle: none -> proficient -> expertise -> none
  if (toggle.classList.contains('expertise')) {
    toggle.classList.remove('expertise');
  } else if (toggle.classList.contains('proficient')) {
    toggle.classList.remove('proficient');
    toggle.classList.add('expertise');
  } else {
    toggle.classList.add('proficient');
  }
  
  updateSkill(skill);
  if (skill === 'perception') {
    updatePassivePerception();
  }
}

function updateInitiative() {
  const dexMod = calculateModifier(parseInt(abilityInputs.dex.value) || 10);
  document.getElementById('initiative').textContent = formatModifier(dexMod);
}

function updatePassivePerception() {
  const wisMod = calculateModifier(parseInt(abilityInputs.wis.value) || 10);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  const state = getSkillProficiencyState('perception');
  let total = 10 + wisMod;
  if (state === 1) {
    total += profBonus;
  } else if (state === 2) {
    total += profBonus * 2;
  }
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
  updateSpellcastingStats();
}

// ====== COMBAT ACTIONS ======
let currentActionType = 'weapon';
let editingActionIndex = null;

function renderCombatActions(actions) {
  const container = document.getElementById('combat-actions-content');
  container.innerHTML = '';
  
  // Update prepared spells count
  let preparedCount = 0;
  if (actions) {
    preparedCount = actions.filter(a => (a.type === 'spell-attack' || a.type === 'spell-save' || a.type === 'spell') && a.prepared).length;
  }
  const preparedCountEl = document.getElementById('prepared-spells-count');
  if (preparedCountEl) {
    preparedCountEl.textContent = `Prepared: ${preparedCount}`;
  }
  
  if (!actions || actions.length === 0) {
    container.innerHTML = '<div class="empty-message" style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px;">No combat actions yet</div>';
    return;
  }
  
  actions.forEach((action, index) => {
    const card = document.createElement('div');
    card.className = 'combat-action-card';
    card.draggable = true;
    card.dataset.index = index;
    card.dataset.key = 'combatActions';
    
    let statsHtml = '';
    if (action.castingTime) {
      statsHtml += `<div class="combat-action-stat"><span class="combat-action-stat-label">Time:</span><span class="combat-action-stat-value">${action.castingTime}</span></div>`;
    }
    if (action.atk) {
      statsHtml += `<div class="combat-action-stat"><span class="combat-action-stat-label">${action.type === 'spell-save' ? 'DC:' : 'Atk:'}</span><span class="combat-action-stat-value">${action.atk}</span></div>`;
    }
    if (action.damage) {
      statsHtml += `<div class="combat-action-stat"><span class="combat-action-stat-label">Dmg:</span><span class="combat-action-stat-value">${action.damage}</span></div>`;
    }
    if (action.range) {
      statsHtml += `<div class="combat-action-stat"><span class="combat-action-stat-label">Range:</span><span class="combat-action-stat-value">${action.range}</span></div>`;
    }
    
    // Build spell indicators (P, C, R, M) as superscript badges
    let indicatorsHtml = '';
    if (action.type === 'spell-attack' || action.type === 'spell-save' || action.type === 'spell') {
      const indicators = [];
      if (action.prepared) indicators.push('<span class="spell-indicator prepared">P</span>');
      if (action.concentration) indicators.push('<span class="spell-indicator concentration">C</span>');
      if (action.ritual) indicators.push('<span class="spell-indicator ritual">R</span>');
      if (action.materials) indicators.push('<span class="spell-indicator materials">M</span>');
      if (indicators.length > 0) {
        indicatorsHtml = indicators.join('');
      }
    }
    
    // Spell level badge
    let spellLevelBadge = '';
    if ((action.type === 'spell-attack' || action.type === 'spell-save' || action.type === 'spell') && action.spellLevel) {
      const levelText = action.spellLevel === 'cantrip' ? 'C' : action.spellLevel;
      spellLevelBadge = `<span class="spell-level-badge">${levelText}</span>`;
    }
    
    let usesHtml = '';
    if (action.type === 'action') {
      if (action.uses === 0) {
        usesHtml = '<div class="combat-action-uses"><span class="combat-action-uses-label">Uses: ∞</span></div>';
      } else if (action.uses > 0) {
        usesHtml = `
          <div class="combat-action-uses">
            <span class="combat-action-uses-label">Uses:</span>
            <div class="combat-action-uses-checkboxes" data-index="${index}">
              ${Array(action.uses).fill(0).map((_, i) => 
                `<div class="combat-action-use-checkbox${action.usedUses?.includes(i) ? ' used' : ''}" data-use-index="${i}"></div>`
              ).join('')}
            </div>
          </div>
        `;
      }
    }
    
    const typeLabel = {
      'weapon': 'Weapon',
      'spell-attack': 'Spell Atk',
      'spell-save': 'Spell Save',
      'spell': 'Spell',
      'action': 'Action'
    }[action.type] || action.type;
    
    card.innerHTML = `
      <span class="drag-handle combat-action-drag">⋮⋮</span>
      <div class="combat-action-header">
        <div class="combat-action-name-wrapper">
          ${indicatorsHtml}
          <span class="combat-action-name">${action.name}</span>
          ${spellLevelBadge}
        </div>
        <span class="combat-action-type">${typeLabel}</span>
      </div>
      <div class="combat-action-stats">${statsHtml}</div>
      ${usesHtml}
      ${action.notes ? `<div class="combat-action-notes">${action.notes}</div>` : ''}
      <div class="combat-action-buttons">
        <button class="combat-action-edit" data-index="${index}">✎</button>
        <button class="combat-action-delete" data-index="${index}">&times;</button>
      </div>
    `;
    
    // Drag events
    card.addEventListener('dragstart', handleCombatActionDragStart);
    card.addEventListener('dragend', handleCombatActionDragEnd);
    card.addEventListener('dragover', handleCombatActionDragOver);
    card.addEventListener('drop', handleCombatActionDrop);
    card.addEventListener('dragleave', handleCombatActionDragLeave);
    
    container.appendChild(card);
  });
  
  // Add edit listeners
  container.querySelectorAll('.combat-action-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editCombatAction(parseInt(e.target.dataset.index));
    });
  });
  
  // Add delete listeners
  container.querySelectorAll('.combat-action-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteCombatAction(parseInt(e.target.dataset.index));
    });
  });
  
  // Add use checkbox listeners
  container.querySelectorAll('.combat-action-use-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      const actionIndex = parseInt(e.target.closest('.combat-action-uses-checkboxes').dataset.index);
      const useIndex = parseInt(e.target.dataset.useIndex);
      toggleCombatActionUse(actionIndex, useIndex);
    });
  });
}

function toggleCombatActionUse(actionIndex, useIndex) {
  const action = currentCharacter.combatActions?.[actionIndex];
  if (!action) return;
  
  if (!action.usedUses) action.usedUses = [];
  
  const idx = action.usedUses.indexOf(useIndex);
  if (idx === -1) {
    action.usedUses.push(useIndex);
  } else {
    action.usedUses.splice(idx, 1);
  }
  
  renderCombatActions(currentCharacter.combatActions);
}

function confirmDeleteCombatAction(index) {
  const action = currentCharacter.combatActions?.[index];
  if (!action) return;
  
  pendingDelete = { key: 'combatActions', index };
  document.getElementById('delete-confirm-message').textContent = 
    `Are you sure you want to delete "${action.name}"?`;
  document.getElementById('delete-confirm-modal').classList.add('active');
}

function openCombatActionModal() {
  editingActionIndex = null;
  document.getElementById('action-name').value = '';
  document.getElementById('action-casting-time').value = 'Action';
  document.getElementById('action-atk').value = '';
  document.getElementById('action-damage').value = '';
  document.getElementById('action-range').value = '';
  document.getElementById('action-uses').value = '1';
  document.getElementById('action-notes').value = '';
  document.getElementById('action-concentration').checked = false;
  document.getElementById('action-ritual').checked = false;
  document.getElementById('action-materials').checked = false;
  document.getElementById('action-spell-level').value = 'cantrip';
  document.getElementById('action-prepared').checked = false;
  
  // Reset to weapon type
  currentActionType = 'weapon';
  document.querySelectorAll('.action-type-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === 'weapon');
  });
  updateCombatActionModalFields();
  
  document.querySelector('#combat-action-modal .modal-header h3').textContent = 'Add Combat Action';
  document.getElementById('save-combat-action-btn').textContent = 'Add Action';
  document.getElementById('combat-action-modal').classList.add('active');
}

function editCombatAction(index) {
  const action = currentCharacter.combatActions?.[index];
  if (!action) return;
  
  editingActionIndex = index;
  currentActionType = action.type;
  
  document.getElementById('action-name').value = action.name || '';
  document.getElementById('action-casting-time').value = action.castingTime || 'Action';
  document.getElementById('action-atk').value = action.atk || '';
  document.getElementById('action-damage').value = action.damage || '';
  document.getElementById('action-range').value = action.range || '';
  document.getElementById('action-uses').value = action.uses || 1;
  document.getElementById('action-notes').value = action.notes || '';
  document.getElementById('action-concentration').checked = action.concentration || false;
  document.getElementById('action-ritual').checked = action.ritual || false;
  document.getElementById('action-materials').checked = action.materials || false;
  document.getElementById('action-spell-level').value = action.spellLevel || 'cantrip';
  document.getElementById('action-prepared').checked = action.prepared || false;
  
  document.querySelectorAll('.action-type-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === action.type);
  });
  updateCombatActionModalFields();
  
  document.querySelector('#combat-action-modal .modal-header h3').textContent = 'Edit Combat Action';
  document.getElementById('save-combat-action-btn').textContent = 'Save Changes';
  document.getElementById('combat-action-modal').classList.add('active');
}

function updateCombatActionModalFields() {
  const castingTimeGroup = document.getElementById('casting-time-group');
  const atkBonusGroup = document.getElementById('atk-bonus-group');
  const atkBonusLabel = document.getElementById('atk-bonus-label');
  const damageGroup = document.getElementById('damage-group');
  const rangeGroup = document.getElementById('range-group');
  const usesGroup = document.getElementById('uses-group');
  const spellOptionsGroup = document.getElementById('spell-options-group');
  const spellLevelRow = document.getElementById('spell-level-row');
  const atkInput = document.getElementById('action-atk');
  const castingTimeInput = document.getElementById('action-casting-time');
  
  // Show/hide based on type
  switch (currentActionType) {
    case 'weapon':
      castingTimeGroup.style.display = 'block';
      castingTimeInput.value = 'Action';
      castingTimeInput.readOnly = true;
      atkBonusGroup.style.display = 'block';
      atkBonusLabel.textContent = 'Attack Bonus';
      atkInput.placeholder = 'e.g., +5';
      atkInput.readOnly = false;
      damageGroup.style.display = 'block';
      rangeGroup.style.display = 'block';
      usesGroup.style.display = 'none';
      spellOptionsGroup.style.display = 'none';
      spellLevelRow.style.display = 'none';
      break;
    case 'spell-attack':
      castingTimeGroup.style.display = 'block';
      castingTimeInput.readOnly = false;
      atkBonusGroup.style.display = 'block';
      atkBonusLabel.textContent = 'Attack Bonus (auto)';
      atkInput.value = getSpellAttackBonus();
      atkInput.readOnly = true;
      damageGroup.style.display = 'block';
      rangeGroup.style.display = 'block';
      usesGroup.style.display = 'none';
      spellOptionsGroup.style.display = 'block';
      spellLevelRow.style.display = 'flex';
      break;
    case 'spell-save':
      castingTimeGroup.style.display = 'block';
      castingTimeInput.readOnly = false;
      atkBonusGroup.style.display = 'block';
      atkBonusLabel.textContent = 'Spell Save DC (auto)';
      atkInput.value = getSpellSaveDC();
      atkInput.readOnly = true;
      damageGroup.style.display = 'block';
      rangeGroup.style.display = 'block';
      usesGroup.style.display = 'none';
      spellOptionsGroup.style.display = 'block';
      spellLevelRow.style.display = 'flex';
      break;
    case 'spell':
      castingTimeGroup.style.display = 'block';
      castingTimeInput.readOnly = false;
      atkBonusGroup.style.display = 'none';
      damageGroup.style.display = 'none';
      rangeGroup.style.display = 'block';
      usesGroup.style.display = 'none';
      spellOptionsGroup.style.display = 'block';
      spellLevelRow.style.display = 'flex';
      break;
    case 'action':
      castingTimeGroup.style.display = 'block';
      castingTimeInput.readOnly = false;
      atkBonusGroup.style.display = 'none';
      damageGroup.style.display = 'none';
      rangeGroup.style.display = 'block';
      usesGroup.style.display = 'block';
      spellOptionsGroup.style.display = 'none';
      spellLevelRow.style.display = 'none';
      break;
  }
}

function getSpellAttackBonus() {
  const ability = currentCharacter?.spellcastingAbility;
  if (!ability) return '—';
  const abilityScore = parseInt(abilityInputs[ability]?.value) || 10;
  const spellMod = calculateModifier(abilityScore);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  return formatModifier(profBonus + spellMod);
}

function getSpellSaveDC() {
  const ability = currentCharacter?.spellcastingAbility;
  if (!ability) return '—';
  const abilityScore = parseInt(abilityInputs[ability]?.value) || 10;
  const spellMod = calculateModifier(abilityScore);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  return String(8 + profBonus + spellMod);
}

function saveCombatAction() {
  const action = {
    type: currentActionType,
    name: document.getElementById('action-name').value,
    castingTime: document.getElementById('action-casting-time').value,
    range: document.getElementById('action-range').value,
    notes: document.getElementById('action-notes').value,
  };
  
  if (!action.name) return;
  
  if (currentActionType === 'weapon' || currentActionType === 'spell-attack' || currentActionType === 'spell-save') {
    action.atk = document.getElementById('action-atk').value;
    action.damage = document.getElementById('action-damage').value;
  }
  
  if (currentActionType === 'spell-attack' || currentActionType === 'spell-save' || currentActionType === 'spell') {
    action.concentration = document.getElementById('action-concentration').checked;
    action.ritual = document.getElementById('action-ritual').checked;
    action.materials = document.getElementById('action-materials').checked;
    action.spellLevel = document.getElementById('action-spell-level').value;
    action.prepared = document.getElementById('action-prepared').checked;
  }
  
  if (currentActionType === 'action') {
    action.uses = parseInt(document.getElementById('action-uses').value) || 0;
    // Preserve usedUses when editing
    if (editingActionIndex !== null && currentCharacter.combatActions[editingActionIndex]?.usedUses) {
      action.usedUses = currentCharacter.combatActions[editingActionIndex].usedUses.filter(i => i < action.uses);
    } else {
      action.usedUses = [];
    }
  }
  
  if (!currentCharacter.combatActions) {
    currentCharacter.combatActions = [];
  }
  
  if (editingActionIndex !== null) {
    currentCharacter.combatActions[editingActionIndex] = action;
  } else {
    currentCharacter.combatActions.push(action);
  }
  
  renderCombatActions(currentCharacter.combatActions);
  closeModal('combat-action-modal');
  editingActionIndex = null;
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ====== CLASS FEATURES ======
// Track editing state for different item types
let editingItemIndex = null;
let editingItemKey = null;

// Generic render function for draggable items with title/description (class features, species traits, feats)
function renderDraggableItems(containerId, items, dataKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  items.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'draggable-item';
    el.draggable = true;
    el.dataset.index = index;
    el.dataset.key = dataKey;
    el.innerHTML = `
      <span class="drag-handle">⋮⋮</span>
      <div class="item-header">
        <span class="item-title">${item.title}</span>
        <div class="item-buttons">
          <button class="item-edit-btn" data-index="${index}" data-key="${dataKey}">✎</button>
          <button class="delete-item-btn" data-index="${index}" data-key="${dataKey}">&times;</button>
        </div>
      </div>
      <div class="item-desc">${item.description || ''}</div>
    `;
    container.appendChild(el);
    
    // Drag events
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);
    el.addEventListener('dragleave', handleDragLeave);
  });
  
  // Add edit listeners
  container.querySelectorAll('.item-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      const key = e.target.dataset.key;
      editDraggableItem(key, index);
    });
  });
  
  // Add delete listeners
  container.querySelectorAll('.delete-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      const key = e.target.dataset.key;
      deleteItem(key, index);
    });
  });
}

// Render simple items (languages, resistances) - single field, no description
function renderSimpleItems(containerId, items, dataKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  items.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'simple-item';
    el.draggable = true;
    el.dataset.index = index;
    el.dataset.key = dataKey;
    el.innerHTML = `
      <span class="item-name"><span class="drag-handle">⋮⋮</span>${item}</span>
      <div class="simple-item-buttons">
        <button class="simple-item-edit" data-index="${index}" data-key="${dataKey}">✎</button>
        <button class="simple-item-delete" data-index="${index}" data-key="${dataKey}">&times;</button>
      </div>
    `;
    container.appendChild(el);
    
    // Drag events
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);
    el.addEventListener('dragleave', handleDragLeave);
  });
  
  // Add edit listeners
  container.querySelectorAll('.simple-item-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      const key = e.target.dataset.key;
      editSimpleItem(key, index);
    });
  });
  
  // Add delete listeners
  container.querySelectorAll('.simple-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      const key = e.target.dataset.key;
      deleteItem(key, index);
    });
  });
}

// Drag and drop handlers
let draggedItem = null;
let draggedIndex = null;
let draggedKey = null;

function handleDragStart(e) {
  e.stopPropagation();
  draggedItem = this;
  draggedIndex = parseInt(this.dataset.index);
  draggedKey = this.dataset.key;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.stopPropagation();
  this.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedItem = null;
  draggedIndex = null;
  draggedKey = null;
}

function handleDragOver(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // Only allow drop on same type
  if (this.dataset.key !== draggedKey) return;
  if (this === draggedItem) return;
  
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.stopPropagation();
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (this === draggedItem) return;
  if (this.dataset.key !== draggedKey) return;
  
  const targetIndex = parseInt(this.dataset.index);
  const key = this.dataset.key;
  
  // Reorder the array
  const arr = currentCharacter[key];
  if (!arr) return;
  
  const [removed] = arr.splice(draggedIndex, 1);
  arr.splice(targetIndex, 0, removed);
  
  // Re-render
  if (key === 'languages' || key === 'resistances') {
    renderSimpleItems(getContainerId(key), arr, key);
  } else {
    renderDraggableItems(getContainerId(key), arr, key);
  }
}

// Combat action drag handlers
let draggedActionItem = null;
let draggedActionIndex = null;

function handleCombatActionDragStart(e) {
  draggedActionItem = this;
  draggedActionIndex = parseInt(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleCombatActionDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.combat-action-card.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedActionItem = null;
  draggedActionIndex = null;
}

function handleCombatActionDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (this === draggedActionItem) return;
  this.classList.add('drag-over');
}

function handleCombatActionDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleCombatActionDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (this === draggedActionItem) return;
  
  const targetIndex = parseInt(this.dataset.index);
  
  // Reorder the array
  const arr = currentCharacter.combatActions;
  if (!arr) return;
  
  const [removed] = arr.splice(draggedActionIndex, 1);
  arr.splice(targetIndex, 0, removed);
  
  // Re-render
  renderCombatActions(arr);
}

function getContainerId(key) {
  const map = {
    'classFeatures': 'class-features-content',
    'speciesTraits': 'species-traits-content',
    'feats': 'feats-content',
    'languages': 'languages-content',
    'resistances': 'resistances-content',
    'equipment': 'equipment-content',
  };
  return map[key];
}

// Feature box drag handlers
let draggedFeatureBox = null;
let featureBoxDragAllowed = false;

function initFeatureBoxDragHandlers() {
  const container = document.getElementById('right-features-container');
  if (!container) return;
  
  container.querySelectorAll('.draggable-feature').forEach(box => {
    // Track mousedown on handle to allow drag
    const handle = box.querySelector('.feature-drag-handle');
    if (handle) {
      handle.addEventListener('mousedown', () => {
        featureBoxDragAllowed = true;
      });
    }
    
    box.addEventListener('dragstart', handleFeatureBoxDragStart);
    box.addEventListener('dragend', handleFeatureBoxDragEnd);
    box.addEventListener('dragover', handleFeatureBoxDragOver);
    box.addEventListener('dragleave', handleFeatureBoxDragLeave);
    box.addEventListener('drop', handleFeatureBoxDrop);
  });
  
  // Reset flag on mouseup anywhere
  document.addEventListener('mouseup', () => {
    featureBoxDragAllowed = false;
  });
}

function handleFeatureBoxDragStart(e) {
  // Only allow drag if started from handle
  if (!featureBoxDragAllowed) {
    e.preventDefault();
    return;
  }
  
  draggedFeatureBox = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.id);
  
  // Use timeout to prevent visual glitch
  setTimeout(() => {
    this.style.opacity = '0.5';
  }, 0);
}

function handleFeatureBoxDragEnd(e) {
  this.classList.remove('dragging');
  this.style.opacity = '';
  document.querySelectorAll('.draggable-feature.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedFeatureBox = null;
  featureBoxDragAllowed = false;
}

function handleFeatureBoxDragOver(e) {
  // Only handle if we're dragging a feature box
  if (!draggedFeatureBox) return;
  
  // Don't interfere with inner item drags
  if (e.target.closest('.draggable-item') || e.target.closest('.simple-item') || e.target.closest('.combat-action-card')) return;
  
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (this === draggedFeatureBox) return;
  this.classList.add('drag-over');
}

function handleFeatureBoxDragLeave(e) {
  if (!draggedFeatureBox) return;
  this.classList.remove('drag-over');
}

function handleFeatureBoxDrop(e) {
  // Only handle if we're dragging a feature box
  if (!draggedFeatureBox) return;
  
  // Don't interfere with inner item drags
  if (e.target.closest('.draggable-item') || e.target.closest('.simple-item') || e.target.closest('.combat-action-card')) return;
  
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('drag-over');
  
  if (this === draggedFeatureBox) return;
  
  const container = document.getElementById('right-features-container');
  const boxes = [...container.querySelectorAll('.draggable-feature')];
  const fromIndex = boxes.indexOf(draggedFeatureBox);
  const toIndex = boxes.indexOf(this);
  
  // Swap positions (true swap, not insert)
  if (fromIndex !== toIndex) {
    const fromBox = draggedFeatureBox;
    const toBox = this;
    
    // Create placeholder
    const placeholder = document.createElement('div');
    container.insertBefore(placeholder, fromBox);
    
    // Move boxes
    container.insertBefore(fromBox, toBox);
    container.insertBefore(toBox, placeholder);
    
    // Remove placeholder
    container.removeChild(placeholder);
  }
  
  // Save the order to character
  saveFeatureBoxOrder();
}

function saveFeatureBoxOrder() {
  const container = document.getElementById('right-features-container');
  if (!container) return;
  
  const order = [...container.querySelectorAll('.draggable-feature')].map(box => box.id);
  currentCharacter.featureBoxOrder = order;
}

function restoreFeatureBoxOrder() {
  const container = document.getElementById('right-features-container');
  if (!container || !currentCharacter?.featureBoxOrder) return;
  
  const order = currentCharacter.featureBoxOrder;
  const boxes = [...container.querySelectorAll('.draggable-feature')];
  
  // Sort boxes according to saved order
  order.forEach(id => {
    const box = boxes.find(b => b.id === id);
    if (box) {
      container.appendChild(box);
    }
  });
}

// Pending delete info for confirmation
let pendingDelete = { key: null, index: null };

function confirmDeleteItem(key, index) {
  pendingDelete = { key, index };
  const itemName = getItemName(key, index);
  document.getElementById('delete-confirm-message').textContent = 
    `Are you sure you want to delete "${itemName}"?`;
  document.getElementById('delete-confirm-modal').classList.add('active');
}

function getItemName(key, index) {
  const item = currentCharacter[key]?.[index];
  if (!item) return 'this item';
  if (typeof item === 'string') return item;
  return item.title || item.name || 'this item';
}

function executeDelete() {
  const { key, index } = pendingDelete;
  if (!key || index === null || !currentCharacter[key]) return;
  
  currentCharacter[key].splice(index, 1);
  
  if (key === 'combatActions') {
    renderCombatActions(currentCharacter[key]);
  } else if (key === 'languages' || key === 'resistances') {
    renderSimpleItems(getContainerId(key), currentCharacter[key], key);
  } else {
    renderDraggableItems(getContainerId(key), currentCharacter[key], key);
  }
  
  closeModal('delete-confirm-modal');
  pendingDelete = { key: null, index: null };
}

function deleteItem(key, index) {
  confirmDeleteItem(key, index);
}

// Edit functions for different item types
function editDraggableItem(key, index) {
  const item = currentCharacter[key]?.[index];
  if (!item) return;
  
  editingItemKey = key;
  editingItemIndex = index;
  
  if (key === 'classFeatures') {
    document.getElementById('feature-title').value = item.title || '';
    document.getElementById('feature-description').value = item.description || '';
    document.querySelector('#class-feature-modal .modal-header h3').textContent = 'Edit Class Feature';
    document.getElementById('save-class-feature-btn').textContent = 'Save Changes';
    document.getElementById('class-feature-modal').classList.add('active');
  } else if (key === 'speciesTraits') {
    document.getElementById('species-trait-title').value = item.title || '';
    document.getElementById('species-trait-description').value = item.description || '';
    document.querySelector('#species-trait-modal .modal-header h3').textContent = 'Edit Species Trait';
    document.getElementById('save-species-trait-btn').textContent = 'Save Changes';
    document.getElementById('species-trait-modal').classList.add('active');
  } else if (key === 'feats') {
    document.getElementById('feat-title').value = item.title || '';
    document.getElementById('feat-description').value = item.description || '';
    document.querySelector('#feat-modal .modal-header h3').textContent = 'Edit Feat';
    document.getElementById('save-feat-btn').textContent = 'Save Changes';
    document.getElementById('feat-modal').classList.add('active');
  } else if (key === 'equipment') {
    document.getElementById('equipment-title').value = item.title || '';
    document.getElementById('equipment-description').value = item.description || '';
    document.querySelector('#equipment-modal .modal-header h3').textContent = 'Edit Equipment';
    document.getElementById('save-equipment-btn').textContent = 'Save Changes';
    document.getElementById('equipment-modal').classList.add('active');
  }
}

function editSimpleItem(key, index) {
  const item = currentCharacter[key]?.[index];
  if (!item) return;
  
  editingItemKey = key;
  editingItemIndex = index;
  
  if (key === 'languages') {
    document.getElementById('language-name').value = item;
    document.querySelector('#language-modal .modal-header h3').textContent = 'Edit Language';
    document.getElementById('save-language-btn').textContent = 'Save Changes';
    document.getElementById('language-modal').classList.add('active');
  } else if (key === 'resistances') {
    document.getElementById('resistance-name').value = item;
    document.querySelector('#resistance-modal .modal-header h3').textContent = 'Edit Resistance';
    document.getElementById('save-resistance-btn').textContent = 'Save Changes';
    document.getElementById('resistance-modal').classList.add('active');
  }
}

// ====== MODALS ======
function openClassFeatureModal() {
  editingItemKey = null;
  editingItemIndex = null;
  document.getElementById('feature-title').value = '';
  document.getElementById('feature-description').value = '';
  document.querySelector('#class-feature-modal .modal-header h3').textContent = 'Add Class Feature';
  document.getElementById('save-class-feature-btn').textContent = 'Add Feature';
  document.getElementById('class-feature-modal').classList.add('active');
}

function saveClassFeature() {
  const feature = {
    title: document.getElementById('feature-title').value,
    description: document.getElementById('feature-description').value,
  };
  
  if (!feature.title) return;
  
  if (!currentCharacter.classFeatures) {
    currentCharacter.classFeatures = [];
  }
  
  if (editingItemKey === 'classFeatures' && editingItemIndex !== null) {
    currentCharacter.classFeatures[editingItemIndex] = feature;
  } else {
    currentCharacter.classFeatures.push(feature);
  }
  
  renderDraggableItems('class-features-content', currentCharacter.classFeatures, 'classFeatures');
  closeModal('class-feature-modal');
  editingItemKey = null;
  editingItemIndex = null;
}

function addBulletPoint(textareaId) {
  const textarea = document.getElementById(textareaId);
  const cursorPos = textarea.selectionStart;
  const text = textarea.value;
  const before = text.substring(0, cursorPos);
  const after = text.substring(cursorPos);
  textarea.value = before + '\n• ' + after;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = cursorPos + 3;
}

// Species Traits Modal
function openSpeciesTraitModal() {
  editingItemKey = null;
  editingItemIndex = null;
  document.getElementById('species-trait-title').value = '';
  document.getElementById('species-trait-description').value = '';
  document.querySelector('#species-trait-modal .modal-header h3').textContent = 'Add Species Trait';
  document.getElementById('save-species-trait-btn').textContent = 'Add Trait';
  document.getElementById('species-trait-modal').classList.add('active');
}

function saveSpeciesTrait() {
  const trait = {
    title: document.getElementById('species-trait-title').value,
    description: document.getElementById('species-trait-description').value,
  };
  
  if (!trait.title) return;
  
  if (!currentCharacter.speciesTraits) {
    currentCharacter.speciesTraits = [];
  }
  
  if (editingItemKey === 'speciesTraits' && editingItemIndex !== null) {
    currentCharacter.speciesTraits[editingItemIndex] = trait;
  } else {
    currentCharacter.speciesTraits.push(trait);
  }
  
  renderDraggableItems('species-traits-content', currentCharacter.speciesTraits, 'speciesTraits');
  closeModal('species-trait-modal');
  editingItemKey = null;
  editingItemIndex = null;
}

// Feat Modal
function openFeatModal() {
  editingItemKey = null;
  editingItemIndex = null;
  document.getElementById('feat-title').value = '';
  document.getElementById('feat-description').value = '';
  document.querySelector('#feat-modal .modal-header h3').textContent = 'Add Feat';
  document.getElementById('save-feat-btn').textContent = 'Add Feat';
  document.getElementById('feat-modal').classList.add('active');
}

function saveFeat() {
  const feat = {
    title: document.getElementById('feat-title').value,
    description: document.getElementById('feat-description').value,
  };
  
  if (!feat.title) return;
  
  if (!currentCharacter.feats) {
    currentCharacter.feats = [];
  }
  
  if (editingItemKey === 'feats' && editingItemIndex !== null) {
    currentCharacter.feats[editingItemIndex] = feat;
  } else {
    currentCharacter.feats.push(feat);
  }
  
  renderDraggableItems('feats-content', currentCharacter.feats, 'feats');
  closeModal('feat-modal');
  editingItemKey = null;
  editingItemIndex = null;
}

// Language Modal
function openLanguageModal() {
  editingItemKey = null;
  editingItemIndex = null;
  document.getElementById('language-name').value = '';
  document.querySelector('#language-modal .modal-header h3').textContent = 'Add Language';
  document.getElementById('save-language-btn').textContent = 'Add Language';
  document.getElementById('language-modal').classList.add('active');
}

function saveLanguage() {
  const name = document.getElementById('language-name').value;
  
  if (!name) return;
  
  if (!currentCharacter.languages) {
    currentCharacter.languages = [];
  }
  
  if (editingItemKey === 'languages' && editingItemIndex !== null) {
    currentCharacter.languages[editingItemIndex] = name;
  } else {
    currentCharacter.languages.push(name);
  }
  
  renderSimpleItems('languages-content', currentCharacter.languages, 'languages');
  closeModal('language-modal');
  editingItemKey = null;
  editingItemIndex = null;
}

// Resistance Modal
function openResistanceModal() {
  editingItemKey = null;
  editingItemIndex = null;
  document.getElementById('resistance-name').value = '';
  document.querySelector('#resistance-modal .modal-header h3').textContent = 'Add Resistance';
  document.getElementById('save-resistance-btn').textContent = 'Add Resistance';
  document.getElementById('resistance-modal').classList.add('active');
}

function saveResistance() {
  const name = document.getElementById('resistance-name').value;
  
  if (!name) return;
  
  if (!currentCharacter.resistances) {
    currentCharacter.resistances = [];
  }
  
  if (editingItemKey === 'resistances' && editingItemIndex !== null) {
    currentCharacter.resistances[editingItemIndex] = name;
  } else {
    currentCharacter.resistances.push(name);
  }
  
  renderSimpleItems('resistances-content', currentCharacter.resistances, 'resistances');
  closeModal('resistance-modal');
  editingItemKey = null;
  editingItemIndex = null;
}

// Equipment Modal
function openEquipmentModal() {
  editingItemKey = null;
  editingItemIndex = null;
  document.getElementById('equipment-title').value = '';
  document.getElementById('equipment-description').value = '';
  document.querySelector('#equipment-modal .modal-header h3').textContent = 'Add Equipment';
  document.getElementById('save-equipment-btn').textContent = 'Add Equipment';
  document.getElementById('equipment-modal').classList.add('active');
}

function saveEquipment() {
  const item = {
    title: document.getElementById('equipment-title').value,
    description: document.getElementById('equipment-description').value,
  };
  
  if (!item.title) return;
  
  if (!currentCharacter.equipment) {
    currentCharacter.equipment = [];
  }
  
  if (editingItemKey === 'equipment' && editingItemIndex !== null) {
    currentCharacter.equipment[editingItemIndex] = item;
  } else {
    currentCharacter.equipment.push(item);
  }
  
  renderDraggableItems('equipment-content', currentCharacter.equipment, 'equipment');
  closeModal('equipment-modal');
  editingItemKey = null;
  editingItemIndex = null;
}

// ====== SPELLCASTING ======
function setSpellcastingAbility(ability) {
  // Remove selected from all buttons
  document.querySelectorAll('.spell-ability-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Add selected to clicked button
  const btn = document.querySelector(`.spell-ability-btn[data-ability="${ability}"]`);
  if (btn) {
    btn.classList.add('selected');
  }
  
  currentCharacter.spellcastingAbility = ability;
  updateSpellcastingStats();
}

function updateSpellcastingStats() {
  const ability = currentCharacter?.spellcastingAbility;
  const spellModEl = document.getElementById('spellcasting-mod');
  const spellDcEl = document.getElementById('spell-save-dc');
  const spellAtkEl = document.getElementById('spell-attack-bonus');
  
  if (!ability) {
    spellModEl.textContent = '—';
    spellDcEl.textContent = '—';
    spellAtkEl.textContent = '—';
    return;
  }
  
  const abilityScore = parseInt(abilityInputs[ability]?.value) || 10;
  const spellMod = calculateModifier(abilityScore);
  const profBonus = parseInt(document.getElementById('proficiency-bonus').value) || 2;
  
  const spellSaveDc = 8 + profBonus + spellMod;
  const spellAttackBonus = profBonus + spellMod;
  
  spellModEl.textContent = formatModifier(spellMod);
  spellDcEl.textContent = spellSaveDc;
  spellAtkEl.textContent = formatModifier(spellAttackBonus);
}

// ====== SPELL SLOTS ======
function updateSpellSlotCheckboxes(level) {
  const row = document.querySelector(`.spell-slot-row[data-level="${level}"]`);
  if (!row) return;
  
  const maxInput = row.querySelector('.spell-slot-max');
  const checkboxContainer = row.querySelector('.spell-slot-checkboxes');
  const max = parseInt(maxInput.value) || 0;
  
  // Get current used slots from character data
  const usedSlots = currentCharacter?.spellSlots?.[level]?.used || [];
  
  checkboxContainer.innerHTML = '';
  
  for (let i = 0; i < max; i++) {
    const checkbox = document.createElement('div');
    checkbox.className = 'spell-slot-checkbox';
    if (usedSlots.includes(i)) {
      checkbox.classList.add('used');
    }
    checkbox.dataset.index = i;
    checkbox.dataset.level = level;
    checkbox.addEventListener('click', toggleSpellSlot);
    checkboxContainer.appendChild(checkbox);
  }
  
  // Update character data
  if (!currentCharacter.spellSlots) {
    currentCharacter.spellSlots = {};
  }
  if (!currentCharacter.spellSlots[level]) {
    currentCharacter.spellSlots[level] = { max: 0, used: [] };
  }
  currentCharacter.spellSlots[level].max = max;
  // Filter out any used indices that are now out of range
  currentCharacter.spellSlots[level].used = usedSlots.filter(i => i < max);
}

function toggleSpellSlot(e) {
  const checkbox = e.target;
  const level = checkbox.dataset.level;
  const index = parseInt(checkbox.dataset.index);
  
  if (!currentCharacter.spellSlots) {
    currentCharacter.spellSlots = {};
  }
  if (!currentCharacter.spellSlots[level]) {
    currentCharacter.spellSlots[level] = { max: 0, used: [] };
  }
  
  const used = currentCharacter.spellSlots[level].used;
  const usedIndex = used.indexOf(index);
  
  if (usedIndex === -1) {
    used.push(index);
    checkbox.classList.add('used');
  } else {
    used.splice(usedIndex, 1);
    checkbox.classList.remove('used');
  }
}

function initSpellSlots() {
  const levels = ['1', '2', '3', '4', '5', 'other'];
  
  levels.forEach(level => {
    const row = document.querySelector(`.spell-slot-row[data-level="${level}"]`);
    if (!row) return;
    
    const maxInput = row.querySelector('.spell-slot-max');
    
    // Set initial value from character data
    const slotData = currentCharacter?.spellSlots?.[level];
    if (slotData) {
      maxInput.value = slotData.max || 0;
    }
    
    // Update checkboxes
    updateSpellSlotCheckboxes(level);
    
    // Add event listener for max input changes
    maxInput.addEventListener('input', () => updateSpellSlotCheckboxes(level));
  });
}

// ====== MINIMIZE TOGGLE ======
// Define the row structure for the right column feature boxes
const featureRows = [
  ['species-traits-section', 'feats-section'],
  ['languages-section', 'resistances-section'],
  ['equipment-section', 'coins-section'],
  ['spellcasting-section', 'spell-slots-section'],
];

function isRowFullyMinimized(rowIndex) {
  if (rowIndex < 0 || rowIndex >= featureRows.length) return true;
  const row = featureRows[rowIndex];
  return row.every(sectionId => {
    const section = document.getElementById(sectionId);
    return section && section.classList.contains('minimized');
  });
}

function updateRowVisibility() {
  // For each row (starting from row 1), check if all previous rows are fully minimized
  featureRows.forEach((row, rowIndex) => {
    row.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      
      const parentRow = section.closest('.bottom-features');
      if (!parentRow) return;
      
      // Check if all rows above this one are fully minimized
      let allAboveMinimized = true;
      for (let i = 0; i < rowIndex; i++) {
        if (!isRowFullyMinimized(i)) {
          allAboveMinimized = false;
          break;
        }
      }
      
      // Add class to parent row to indicate if rows above are collapsed
      if (allAboveMinimized && rowIndex > 0 && isRowFullyMinimized(rowIndex - 1)) {
        parentRow.classList.add('row-above-collapsed');
      } else {
        parentRow.classList.remove('row-above-collapsed');
      }
    });
  });
}

function toggleMinimize(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  const btn = section.querySelector('.minimize-btn');
  section.classList.toggle('minimized');
  btn.textContent = section.classList.contains('minimized') ? '+' : '−';
  
  // Update row visibility after toggling
  updateRowVisibility();
}

// Event Listeners
newCharacterBtn.addEventListener('click', () => {
  if (hasUnsavedChanges()) {
    pendingNavigation = () => doCreateNewCharacter();
    document.getElementById('unsaved-changes-modal').classList.add('active');
    return;
  }
  doCreateNewCharacter();
});

function doCreateNewCharacter() {
  currentCharacter = { id: null, weapons: [], classFeatures: [], speciesTraits: [], feats: [], languages: [], resistances: [] };
  showCharacterSheet();
  populateForm({});
  renderCharacterList();
  updateSavedSnapshot();
}

saveBtn.addEventListener('click', async () => {
  const data = getFormData();
  const saved = await saveCharacter(data);
  currentCharacter = saved;
  await fetchCharacters();
  doSelectCharacter(saved);
  document.getElementById('save-success-modal').classList.add('active');
});

deleteBtn.addEventListener('click', () => {
  if (!currentCharacter?.id) return;
  document.getElementById('delete-character-message').textContent = 
    `Are you sure you want to delete "${currentCharacter.name || 'this character'}"? This cannot be undone.`;
  document.getElementById('delete-character-modal').classList.add('active');
});

document.getElementById('confirm-delete-character-btn').addEventListener('click', async () => {
  if (!currentCharacter?.id) return;
  
  await deleteCharacter(currentCharacter.id);
  currentCharacter = null;
  savedSnapshot = null;
  hideCharacterSheet();
  await fetchCharacters();
  closeModal('delete-character-modal');
});

// Unsaved Changes Modal handlers
document.getElementById('unsaved-save-btn').addEventListener('click', async () => {
  const data = getFormData();
  const saved = await saveCharacter(data);
  currentCharacter = saved;
  await fetchCharacters();
  updateSavedSnapshot();
  closeModal('unsaved-changes-modal');
  if (pendingNavigation) {
    const nav = pendingNavigation;
    pendingNavigation = null;
    nav();
  }
});

document.getElementById('unsaved-discard-btn').addEventListener('click', () => {
  // Mark as clean so navigation proceeds
  savedSnapshot = null;
  closeModal('unsaved-changes-modal');
  if (pendingNavigation) {
    const nav = pendingNavigation;
    pendingNavigation = null;
    nav();
  }
});

// Cancel: clicking X or Cancel buttons in unsaved modal clears pending navigation
document.querySelectorAll('#unsaved-changes-modal [data-modal="unsaved-changes-modal"]').forEach(btn => {
  btn.addEventListener('click', () => {
    pendingNavigation = null;
  });
});

// Warn on page unload (browser tab close/refresh)
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

duplicateBtn.addEventListener('click', async () => {
  if (!currentCharacter) return;
  
  const data = getFormData();
  // Remove the id so it creates a new character
  delete data.id;
  // Append "(Copy)" to the name
  data.name = (data.name || 'Character') + ' (Copy)';
  
  const saved = await saveCharacter(data);
  await fetchCharacters();
  doSelectCharacter(saved);
});

// Ability score changes
Object.keys(abilityInputs).forEach(ability => {
  abilityInputs[ability].addEventListener('input', updateAllCalculations);
});

// Saving throw proficiency changes
Object.keys(saveProfCheckboxes).forEach(ability => {
  saveProfCheckboxes[ability].addEventListener('change', () => updateSavingThrow(ability));
});

// Skill proficiency toggles (3-state: click to cycle)
Object.keys(skillAbilityMap).forEach(skill => {
  const toggle = document.getElementById(`${skill}-prof`);
  if (toggle) {
    toggle.addEventListener('click', () => cycleSkillProficiency(skill));
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

// Shield toggle - recalculate displayed AC
document.getElementById('shield-equipped').addEventListener('change', (e) => {
  const baseAC = parseInt(document.getElementById('armor-class').value) || 10;
  // Visual feedback only - the actual AC stored is the base
});

// Combat action modal
document.getElementById('add-combat-action-btn').addEventListener('click', openCombatActionModal);
document.getElementById('save-combat-action-btn').addEventListener('click', saveCombatAction);

// Action type selector
document.querySelectorAll('.action-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.action-type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    currentActionType = btn.dataset.type;
    updateCombatActionModalFields();
  });
});

// Class feature modal
document.getElementById('add-class-feature-btn').addEventListener('click', openClassFeatureModal);
document.getElementById('save-class-feature-btn').addEventListener('click', saveClassFeature);
document.getElementById('add-bullet-btn').addEventListener('click', () => addBulletPoint('feature-description'));

// Species trait modal
document.getElementById('add-species-trait-btn').addEventListener('click', openSpeciesTraitModal);
document.getElementById('save-species-trait-btn').addEventListener('click', saveSpeciesTrait);
document.getElementById('add-species-trait-bullet-btn').addEventListener('click', () => addBulletPoint('species-trait-description'));

// Feat modal
document.getElementById('add-feat-btn').addEventListener('click', openFeatModal);
document.getElementById('save-feat-btn').addEventListener('click', saveFeat);
document.getElementById('add-feat-bullet-btn').addEventListener('click', () => addBulletPoint('feat-description'));

// Language modal
document.getElementById('add-language-btn').addEventListener('click', openLanguageModal);
document.getElementById('save-language-btn').addEventListener('click', saveLanguage);

// Resistance modal
document.getElementById('add-resistance-btn').addEventListener('click', openResistanceModal);
document.getElementById('save-resistance-btn').addEventListener('click', saveResistance);

// Delete confirmation
document.getElementById('confirm-delete-btn').addEventListener('click', executeDelete);

// Equipment modal
document.getElementById('add-equipment-btn').addEventListener('click', openEquipmentModal);
document.getElementById('save-equipment-btn').addEventListener('click', saveEquipment);
document.getElementById('add-equipment-bullet-btn').addEventListener('click', () => addBulletPoint('equipment-description'));

// Spellcasting ability selector
document.querySelectorAll('.spell-ability-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setSpellcastingAbility(btn.dataset.ability);
  });
});

// Remaining placeholders (+ buttons don't do anything yet)
document.getElementById('add-coin-btn').addEventListener('click', () => {
  // Placeholder - not implemented yet
});

// Modal close buttons
document.querySelectorAll('.modal-close, .modal-footer .btn[data-modal]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modalId = e.target.dataset.modal;
    if (modalId) closeModal(modalId);
  });
});

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// Minimize buttons
document.querySelectorAll('.minimize-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const sectionId = e.target.dataset.target;
    toggleMinimize(sectionId);
  });
});

// Initialize
fetchCharacters();
initFeatureBoxDragHandlers();
