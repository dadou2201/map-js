'use strict';

//classe parente workout:
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // on va transformer la date en string puis prendre les 10 der
  //chiffre pour creer un id , en general on utilise des database pour ca qui creer automatnt l id
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,long]
    this.distance = distance; //in km
    this.duration = duration; // in minute
    //this._setDescription();
  }

  _setDescription() {
    // pret-ign sert a avoir January , feb ... au lieu de chacun a la ligne
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} `;
  }
  click() {
    this.clicks++;
  }
}

//class enfant running et cycling:
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //en min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type=type;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km per hours
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//Exemple :
// const run1 = new Running([39 - 12], 5.2, 24, 178);
// const cycling1 = new Cycling([39 - 12], 27, 95, 523);
// console.log(run1, cycling1);

//
//////////////////////////////////////////////////////////////////
//Application Architecture:

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//on va transformer ce qu on avait fait jusqu a mtn en class pour avoir du OOP:
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = []; // on va le remplir

  constructor() {
    //Get user Position:
    this._getPosition();

    //Get data from local storage :
    this._getLocalStorage();

    //Attach event handlers:
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); // fera bouger la map sur levent cliquer
  }

  _getPosition() {
    //geolocation avec getCurrentPosition renvoi 2 fonction la premiere si ca reussi la 2eme si echec
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`); // donne le lien google maps de notre position
    //leaflet map ex:
    const coords = [latitude, longitude]; // tabl de nos coordonees a utilise dans setView+marker
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // mapZoomlevel est le zoom on peut mettre 10 etc
    //on peut changer le theme par ex : https://tile.openstreetmap.org/{z}/{x}/{y}.png en
    // https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png , pour avoir un autre style de carte
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //map.on la fonc vient de la ligne 23 ou on utilise L pour leaflet c est comme addEventListener
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    //ici ca va nous permettre de masquer le truc ou on rentre les donnes pour mettre le nouveau workout
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    //change le bouton selectionner entre running et cicling
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    //on va creer une fonction qui va nous aider a avoir un code plus simple et pas repeter:
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // on utilise every pour renvoyer true si tous sont des chiffres sinon false

    //fonction qui va aider a definir si c est negatif ou pas :
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //TRAVAILLER AVEC LES DONNEES ET LES ENTREES POUR CONSTRUIRE LES BONS ENTRAINEMENTS:

    //1. Obtenir les donnees depuis le form
    const type = inputType.value;
    const distance = +inputDistance.value; // le + pour convertir le string en number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; // on desctructure avc {} pour prendre les valeur de latlng de mapEvent qui est le click
    let workout;

    //3. Si c est running , creer un objet running:
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //3.1 Verifier si les donnees sont valides
      if (
        //verifie que les 3 entrees sont des chiffres
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence) c est comme utiliser la fonction validinputs comme ca:
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input have to be positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //4. Si c est cycling , creer un objet cycling:
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //4.1 Verifier si les donnees sont valides
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //5. Ajouter un nouvel objet au tableau Workout:
    this.#workouts.push(workout);

    //6. Rendre workout sur la map avec marker
    this._renderWorkoutMarker(workout);

    //7. Mettre les workout sur la liste sur la gauche
    this._renderWorkout(workout);

    //8. Hide form + effacer les input :
    this._hideForm();

    //9. Set local storage to all workouts:
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //le markeur sur la carte ([lat,lng] pour la position exact bindPopup pour le message au dessus de la balise):
    // on va changer : L.marker([lat, lng]).addTo(map).bindPopup('Workout').openPopup();
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false, //ne ferme pas les autres message au dessus de la balise a chak new
          closeOnClick: false,
          className: `${workout.type}-popup`, // vient du css
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      ) //le contenu du message
      .openPopup(); // ouvre le popup
  }

  _renderWorkout(workout) {
    //fonction qui met les entrainement dans la liste :
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
          `;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
        </div>
    </li>
    `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      // animation leaflet lire la doc pr mieux comprendre
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface pour les click
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // va stocker dans la console --> application -->localstorage
  }

  _getLocalStorage() {
    // reprendre les donnes stocker dans localstorage
    const data = JSON.parse(localStorage.getItem('workouts')); //va rendre un tableau avc les donnees date , id ,click etc
    if (!data) return; // si ya rien de stocker

    this.#workouts = data; // si il y en a il seront donc mis dans le workouts

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    // pour vider le localstorage dans la console --> app.reset();
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//creer on l objet pour faire marcher la classe :
const app = new App();
