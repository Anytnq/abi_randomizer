export const CARD_HEIGHT = 64;
export const TOTAL_CARDS = 60;
export const VISUAL_OFFSET = -5;

export const tierWeights = {
  t0: 5,
  t1: 10,
  t2: 20,
  t3: 60,
  t4: 60,
  t5: 15,
};

export const tierNumberByType = {
  t0: 1,
  t1: 2,
  t2: 3,
  t3: 4,
  t4: 5,
  t5: 6,
};

export const categoryOptionsRow1 = [{ key: "map", label: "Map" }];

export const categoryOptionsRow2 = [
  { key: "helmet", label: "Helmet" },
  { key: "headset", label: "Headset" },
  { key: "chestRig", label: "Chest Rig" },
  { key: "armoredChestRig", label: "Armored Chest Rig" },
  { key: "armor", label: "Armor" },
  { key: "backpack", label: "Backpack" },
];

export const categoryOptionsRow3 = [
  { key: "weapon", label: "Weapon" },
  { key: "secondary", label: "Secondary" },
];

export const categoryOptions = [
  ...categoryOptionsRow1,
  ...categoryOptionsRow2,
  ...categoryOptionsRow3,
];

export const maps = [
  { name: "Farm", type: "t1", weight: 15 },
  { name: "Northridge", type: "t2", weight: 20 },
  { name: "Armory", type: "t4", weight: 40 },
  { name: "TV Station", type: "t5", weight: 40 },
  { name: "Airport", type: "t3", weight: 40 },
];

export const helmets = [
  { name: "T1 Kelsey Fire", type: "t0" },
  { name: "T1 Lwt Safety", type: "t0" },
  { name: "T1 Motorcycle", type: "t0" },
  { name: "T2 Retro Military", type: "t1" },
  { name: "T2 Retro Steel", type: "t1" },
  { name: "T2 Aviator", type: "t1" },
  { name: "T3 PAS2", type: "t2" },
  { name: "T3 F70 Tact.", type: "t2" },
  { name: "T3 SH12 Mil.", type: "t2" },
  { name: "T4 F80 Tact.", type: "t3" },
  { name: "T4 IND Tact.", type: "t3" },
  { name: "T4 KSS Tact.", type: "t3" },
  { name: "T5 FA Assault", type: "t4" },
  { name: "T5 03 Heavy", type: "t4" },
  { name: "T5 RSP Heavy", type: "t4" },
  { name: "T6 6BNT", type: "t5" },
  { name: "T6 HG84 Off.", type: "t5" },
  { name: "T6 DOD9 Blast", type: "t5" },
];

export const armors = [
  { name: "T1 Retro Sapper", type: "t0" },
  { name: "T1 Old Security", type: "t0" },
  { name: "T2 Retro Infantry", type: "t1" },
  { name: "T2 Security", type: "t1" },
  { name: "T2R M1955 Combat", type: "t1" },
  { name: "T3 H-Tac SWAT", type: "t2" },
  { name: "T3 KN Reg.", type: "t2" },
  { name: "T3R Sentry 3", type: "t2" },
  { name: "T4 SEK Fortress", type: "t3" },
  { name: "T4 6B23", type: "t3" },
  { name: "T4R TM1", type: "t3" },
  { name: "T5 H-LC Tac", type: "t4" },
  { name: "T5 BT6 Heavy", type: "t4" },
  { name: "T5R H-Tac A9", type: "t4" },
  { name: "T6 Marshal Hvy", type: "t5" },
  { name: "T6 BT101 Tac", type: "t5" },
  { name: "T6R AL Tactical", type: "t5" },
];

export const weapons = [
  { name: "usas12", type: "t0", weight: 20 },
  { name: "ace31", type: "t0", weight: 20 },
  { name: "MPX", type: "t1", weight: 20 },
  { name: "PP19", type: "t1", weight: 20 },
  { name: "sj16", type: "t2", weight: 30 },
  { name: "m16", type: "t2", weight: 30 },
  { name: "m24", type: "t3", weight: 40 },
  { name: "vss", type: "t3", weight: 40 },
  { name: "mk14", type: "t4", weight: 50 },
  { name: "m110", type: "t4", weight: 50 },
  { name: "H416", type: "t5", weight: 60 },
  { name: "AK-12", type: "t5", weight: 60 },
];

export const chestRigs = [
  { name: "BH Rig", type: "t2" },
  { name: "Hunting Vest", type: "t2" },
  { name: "ALS", type: "t2" },
  { name: "Punk Vest", type: "t2" },
  { name: "L.Vest", type: "t2" },
  { name: "926", type: "t2" },
  { name: "BH2", type: "t2" },
  { name: "Service Vest", type: "t2" },
  { name: "B3 Uni.", type: "t2" },
  { name: "RAP", type: "t2" },
  { name: "ST Type 2", type: "t2" },
  { name: "926 Hunter Vest", type: "t2" },
  { name: "B4 Tactical Chest Rig", type: "t3" },
  { name: "B6 Tactical Chest Rig", type: "t3" },
  { name: "FA Multi.", type: "t3" },
  { name: "ST Type 4", type: "t3" },
  { name: "ST Type 3", type: "t3" },
  { name: "FA Commander", type: "t3" },
  { name: "925 Premium", type: "t3" },
];

export const armoredChestRigs = [
  { name: "M1955", type: "t1" },
  { name: "Sentry 3 Armored Chest Rig", type: "t2" },
  { name: "926 Security Armored Chest Rig", type: "t2" },
  { name: "6B5", type: "t2" },
  { name: "Sentry 305 Armored Chest Rig", type: "t3" },
  { name: "TM1", type: "t3" },
  { name: "TM2", type: "t3" },
  { name: "H-Tac A8", type: "t4" },
  { name: "H-Tac A9", type: "t4" },
  { name: "Warrior", type: "t4" },
  { name: "M4", type: "t4" },
  { name: "Spartan C", type: "t5" },
  { name: "AVS Rig", type: "t5" },
  { name: "AL Tactical Armored Rig", type: "t5" },
  { name: "AL Commander", type: "t5" },
  { name: "AL Assault Armored Rig", type: "t5" },
];

export const headsets = [
  { name: "COM1", type: "t2" },
  { name: "M32", type: "t2" },
  { name: "Z038", type: "t2" },
  { name: "Commander", type: "t2" },
  { name: "GS2", type: "t2" },
];

export const secondaries = [
  { name: "Erlaubt", type: "t3" },
  { name: "Verboten", type: "t3" },
  { name: "Pistol", type: "t3" },
  { name: "Shotgun", type: "t3" },
  { name: "Sniper", type: "t3" },
  { name: "SMG", type: "t3" },
];

export const backpacks = [
  { name: "M.Camping", type: "t2" },
  { name: "Lwt.Camping", type: "t2" },
  { name: "Sling", type: "t2" },
  { name: "Simple", type: "t2" },
  { name: "Canvas", type: "t2" },
  { name: "Camping", type: "t2" },
  { name: "Sports Backpack", type: "t2" },
  { name: "Travel", type: "t2" },
  { name: "L.Camping", type: "t2" },
  { name: "XA4 Tac.", type: "t3" },
  { name: "Cowhide", type: "t3" },
  { name: "R.Marching", type: "t3" },
  { name: "AMP Assault", type: "t3" },
  { name: "Med Field", type: "t3" },
  { name: "Chapman Mil.", type: "t3" },
  { name: "RUSH Tac.", type: "t3" },
  { name: "LUC Exp.", type: "t3" },
  { name: "926", type: "t3" },
];
