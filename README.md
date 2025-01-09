# ✨ Dotfiles Enhancements for Hyprland 🚀

This repository contains significant updates and enhancements to my dotfiles for Hyprland, aiming to improve visual customization and usability through advanced selectors and dynamic themes.

--- 

## 📝 TODOs and Planned Features

### 1. **Waybar Selector 🖱️**
- ➕ Add a **Waybar Selector** to switch between different Waybar styles and configurations effortlessly.
- 🖼️ **Image-Based Previews**: Each style will have an image preview displayed in the selector.

---

### 2. **10 Waybar Configurations and Styles 🎨**
- 🌟 Design and integrate **10 unique Waybar configurations** for a variety of customization options.
- ⚙️ Each style will offer distinct layouts, icons, and functionality.

---

### 3. **Dynamic Color Adaptation 🌈**
- 🖌️ The Waybar Selector will **automatically update colors** based on the dominant colors of the current wallpaper.
- 🔄 This ensures seamless and consistent visual integration with the desktop background.

---

### 4. **Theme Selector 🎭**
- 🧩 Introduce a **Theme Selector** to switch between different predefined themes.
- 🖍️ Each theme will dynamically adjust:
  - **Waybar Colors**
  - **Selectors (App, Wallpaper, Waybar)** based on the theme's general color palette.

---

### 5. **5 Unique Themes 🖼️**
- 🎨 Add **5 distinct themes**, each with a carefully chosen color scheme and visual identity.

---

### 6. **Dedicated Selectors for Different Types 🗂️**
- ➕ Add specialized selectors for:
  - **App Selector**: Select and launch applications.
  - **Theme Selector**: Switch between desktop themes.
  - **Waybar Selector**: Choose Waybar styles.
  - **Wallpaper Selector**: Browse and set wallpapers with image previews.

---

## 💻 Tools & Recommendations for Implementation

### 🛠️ Development Stack
- **Language**: Use **TypeScript** for maintainable and type-safe scripts.
- **Runtime**: Use **Bun.js** for its high performance and modern APIs.
- **Styling**: Leverage **TailwindCSS** for rapid UI prototyping and customization.

### 📦 Suggested Libraries & Tools
1. **Color Extraction**:
   - Use [`color-thief`](https://www.npmjs.com/package/color-thief) or [`vibrant.js`](https://github.com/Vibrant-Colors/node-vibrant) to extract dominant colors from wallpapers dynamically.
   
2. **Wallpaper Selector**:
   - Enhance the user experience using `rofi` with custom `.rasi` themes to display image previews and integrate seamlessly with the Hyprland workflow.
   
3. **Waybar Styles**:
   - Pre-build configurations with modular JSON files that can be dynamically loaded based on the selector input.
   
4. **Theme Management**:
   - Use a centralized configuration file (e.g., `themes.json`) to manage color palettes for themes.

5. **Selectors**:
   - Implement menu-based selectors using:
     - `rofi` for lightweight, responsive menus.
     - Or build a **custom GUI** with **Electron** or **SvelteKit** for a richer experience.

6. **Dynamic Updates**:
   - Use **D-Bus** or **Hyprland socket APIs** to reload Waybar or theme configurations dynamically without restarting the session.

---

## 🛠️ Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/hyprland-dotfiles-enhancements.git
   cd hyprland-dotfiles-enhancements


