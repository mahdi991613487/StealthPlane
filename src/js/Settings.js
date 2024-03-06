window.onload = function() {
    showContent('appearance'); 
   
    const savedDarkMode = localStorage.getItem('darkMode');
    const toggleThemeCheckbox = document.getElementById('toggleTheme');
   
    if (savedDarkMode === 'true') {
      toggleThemeCheckbox.checked = true;
      switchToDarkMode();
    } else {
      toggleThemeCheckbox.checked = false;
      switchToLightMode();
    }
   }
   
   function showContent(id) {
    const contents = document.querySelectorAll('.content');
    contents.forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
   }
   
   function goBack() {
    window.history.back();
   }
   
   document.getElementById('toggleTheme').addEventListener('change', function() {
    if (this.checked) {
      switchToDarkMode();
      localStorage.setItem('darkMode', 'true');
    } else {
      switchToLightMode();
      localStorage.setItem('darkMode', 'false');
    }
   });
   
   function switchToDarkMode() {
    document.body.style.backgroundColor = '#333';
    document.body.style.color = '#fff';
   }
   
   function switchToLightMode() {
    document.body.style.backgroundColor = '#fff';
    document.body.style.color = '#000';
   }