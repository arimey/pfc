import io from 'socket.io-client';
import React from 'react';
import ReactDOM from 'react-dom';
import RoomsView from './components/RoomsView.jsx';

$(document).ready(() => {
    var subj = $('#subjects').val();
    subj = JSON.parse(subj);
    ReactDOM.render(<RoomsView subjects={subj} />, document.getElementById('root'));
});
