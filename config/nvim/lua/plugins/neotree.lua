return {
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    dependencies = {"nvim-lua/plenary.nvim", "nvim-tree/nvim-web-devicons", "MunifTanjim/nui.nvim"},
    init = function()
        vim.g.neo_tree_remove_legacy_commands = true
    end,
    keys = {{
        "<leader>e",
        function()
            local window_exists = false
            for _, win in pairs(vim.api.nvim_list_wins()) do
                if vim.api.nvim_buf_get_option(vim.api.nvim_win_get_buf(win), 'filetype') == 'neo-tree' then
                    window_exists = true
                    vim.api.nvim_win_close(win, true)
                    return
                end
            end

            if not window_exists then
                local reveal_file = vim.fn.expand("%:p")
                if reveal_file == "" then
                    reveal_file = vim.fn.getcwd()
                end
                require("neo-tree.command").execute({
                    toggle = true,
                    source = "filesystem",
                    position = "left",
                    dir = vim.fn.expand("%:p:h"),
                    reveal_file = reveal_file,
                    reveal_force_cwd = true
                })
            end
        end,
        desc = "Toggle Explorer (Current Dir)"
    }, {
        "<leader><C-e>",
        function()
            require("neo-tree.command").execute({
                focus = true,
                source = "filesystem",
                position = "left",
                dir = vim.fn.expand("%:p:h")
            })
        end,
        desc = "Focus Explorer (Current Dir)"
    }, {
        "<leader>E",
        function()
            require("neo-tree.command").execute({
                toggle = true,
                source = "filesystem",
                position = "left",
                dir = vim.fn.expand("~") -- Dynamic home directory
            })
        end,
        desc = "Explorer (Full Directory)"
    }},
    opts = {
        close_if_last_window = true,
        enable_git_status = true,
        enable_diagnostics = true,
        sources = {"filesystem", "buffers", "git_status", "document_symbols"},
        source_selector = {
            winbar = true,
            content_layout = "center",
            sources = {{
                source = "filesystem",
                display_name = "󰉓"
            }, {
                source = "buffers",
                display_name = "󰈙"
            }, {
                source = "git_status",
                display_name = "󰊢"
            }, {
                source = "document_symbols",
                display_name = "󰆧"
            }}
        },
        default_component_configs = {
            indent = {
                padding = 0
            },
            icon = {
                folder_closed = "",
                folder_open = "",
                folder_empty = ""
            },
            name = {
                highlight = "NeoTreeFileName"
            },
            git_status = {
                symbols = {
                    added = "",
                    deleted = "",
                    modified = "",
                    renamed = "",
                    untracked = "",
                    ignored = "",
                    unstaged = "",
                    staged = "",
                    conflict = ""
                }
            }
        },
        window = {
            position = "left",
            width = 20,
            mappings = {
                ["<space>"] = "toggle_node",
                ["<cr>"] = "open",
                ["<C-s>"] = "open_split",
                ["<C-v>"] = "open_vsplit",
                ["<C-t>"] = "open_tabnew",
                ["w"] = "open_with_window_picker",
                ["a"] = "add",
                ["d"] = "delete",
                ["r"] = "rename",
                ["y"] = "copy_to_clipboard",
                ["x"] = "cut_to_clipboard",
                ["p"] = "paste_from_clipboard",
                ["c"] = "copy"
            }
        },
        filesystem = {
            filtered_items = {
                visible = false,
                hide_dotfiles = false,
                hide_gitignored = false
            },
            follow_current_file = true,
            use_libuv_file_watcher = true,
            group_empty_dirs = true
        }
    }
}
