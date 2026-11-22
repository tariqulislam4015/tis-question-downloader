document.getElementById('profile').appendChild(window.TisProfile.build(['photo.jpg', 'photo.png']));
var v = document.querySelector('.pp-ver');
try { v.textContent += '  •  v' + chrome.runtime.getManifest().version; } catch (e) { /* outside extension */ }
