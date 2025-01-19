-- Ensure lazy.nvim is installed and available
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
      { out, "WarningMsg" },
      { "\nPress any key to exit..." },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end
vim.opt.rtp:prepend(lazypath)

-- Setup lazy.nvim with LazyVim and custom plugins
require("lazy").setup({
  spec = {
    -- Add LazyVim and import its plugins
    { "LazyVim/LazyVim", import = "lazyvim.plugins" },
    -- Import/override with your plugins
    { import = "plugins" },
  },
  defaults = {
    -- Lazy loading behavior: set to false for all plugins to load on startup
    lazy = false,
    -- Recommended: disable versioning for now as some plugins may not support it
    version = false, -- Always use the latest git commit
    -- event = "VeryLazy", -- Optional: Use to delay loading of plugins
  },
  install = {
    -- Define the default colorscheme (catppuccin)
    colorscheme = { "catppuccin" },
  },
  checker = {
    enabled = true, -- Enable periodic plugin update checks
    notify = true,  -- Notify on updates
  },
  performance = {
    rtp = {
      -- Disable certain runtime path plugins to optimize performance
      disabled_plugins = {
        "gzip",
        -- "matchit",
        -- "matchparen",
        -- "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})
