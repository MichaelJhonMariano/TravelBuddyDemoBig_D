import { Component, ViewChild, ElementRef, Renderer2, OnInit } from '@angular/core';
import { GmapsService } from '../services/gmaps/gmaps.service';

declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('map', { static: true }) mapElementRef!: ElementRef;
  googleMaps: any;
  center = { lat: 7.109414855022448, lng: 124.83002363960189 };
  map: any;
  searchTerm: string = '';
  searchResults: any[] = [];
  placesService: any;
  marker: any;

  constructor(
    private gmaps: GmapsService,
    private renderer: Renderer2,
  ) { }

  ngOnInit(): void { }

  ngAfterViewInit() {
    this.loadMap();
  }

  async loadMap() {
    try {
      let googleMaps: any = await this.gmaps.loadGoogleMaps();
      this.googleMaps = googleMaps;
      const mapEl = this.mapElementRef.nativeElement;
      const location = new googleMaps.LatLng(this.center.lat, this.center.lng);
      this.map = new googleMaps.Map(mapEl, {
        center: location,
        zoom: 15,
        mapTypeId: googleMaps.MapTypeId.ROADMAP
      });
      this.placesService = new google.maps.places.PlacesService(this.map);
      this.renderer.addClass(mapEl, 'visible');
    } catch (e) {
      console.log(e);
    }
  }

  onSearch() {
    if (this.searchTerm.trim() == '') {
      return;
    }

    const request = {
      input: this.searchTerm,
      types: ['(cities)'],
    };
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions(request, (results: any[], status: any) => {
      if (status == google.maps.places.PlacesServiceStatus.OK && results) {
        this.searchResults = results;

        // remove previous previews if any
        const previewContainer = this.renderer.selectRootElement('#preview-container');
        this.renderer.setProperty(previewContainer, 'innerHTML', '');

        // create preview element for each result and append to container
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const preview = this.renderer.createElement('div');
          this.renderer.setProperty(preview, 'id', 'preview-' + i);
          this.renderer.addClass(preview, 'search-preview');
          preview.innerHTML = result.description;
          this.renderer.listen(preview, 'click', () => {
            const request = {
              placeId: result.place_id,
              fields: ['name', 'geometry']
            };
            const placesService = new google.maps.places.PlacesService(this.map);
            placesService.getDetails(request, (place: any, status: any) => {
              if (status == google.maps.places.PlacesServiceStatus.OK) {
                const position = place.geometry.location;
                this.map.setCenter(position);
                this.map.setZoom(16);
                this.searchResults = [];
                this.searchTerm = place.name;
                if (this.marker) {
                  this.marker.setMap(null);
                }
                this.marker = new google.maps.Marker({
                  position: position,
                  map: this.map,
                  title: place.name
                });
              }
            });
          });
          this.renderer.appendChild(previewContainer, preview);
        }
      } else {
        this.searchResults = [];
      }
    });
  }

  onPreviewClick(result: any) {
    this.searchResults.forEach(r => r.selected = false); // reset all other selected previews
    result.selected = true; // mark the clicked preview as selected

    const request = {
      placeId: result.place_id,
      fields: ['name', 'geometry']
    };
    const placesService = new google.maps.places.PlacesService(this.map);
    placesService.getDetails(request, (place: any, status: any) => {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        const position = place.geometry.location;
        this.map.setCenter(position);
        this.map.setZoom(16);
        this.searchResults = this.searchResults.map(r => ({ ...r, selected: false })); // reset all other selected previews in the array
        this.searchTerm = place.name;
        result.selected = true; // mark the clicked preview as selected again (in case the user clicks it multiple times)

        // Add a marker to the map
        const marker = new google.maps.Marker({
          map: this.map,
          position: position,
          title: place.name
        });
      }
    });
  }

  onResultSelected(result: any) {
    this.placesService.getDetails({ placeId: result.place_id }, (place: any, status: any) => {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        const location = place.geometry.location;
        this.map.setCenter(location);
        this.map.setZoom(16);
        this.searchResults = [];
        this.searchTerm = result.description;

        if (this.marker) {
          this.marker.setMap(null);
        }
        this.marker = new google.maps.Marker({
          position: location,
          map: this.map
        });
      }
    });
  }
}
