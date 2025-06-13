import { configureStore } from '@reduxjs/toolkit';
import AssignReducer from '../components/Assign/AssignSlice';
import SignDocumentReducer from '../components/SignDocument/SignDocumentSlice';
import ViewDocumentReducer from '../components/ViewDocument/ViewDocumentSlice';

export default configureStore({
  reducer: {
    assign: AssignReducer,
    signDoc: SignDocumentReducer,
    viewDoc: ViewDocumentReducer,
  },
});