alter table partners
  add column if not exists bg_color    text not null default '#faf9f6',
  add column if not exists fg_color    text not null default '#000000',
  add column if not exists accent_color text not null default '#501b00',
  add column if not exists font_style  text not null default 'sans';
