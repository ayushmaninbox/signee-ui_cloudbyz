import React, { useEffect } from 'react';
import { navigate } from '@reach/router';
import { useDispatch } from 'react-redux';
import { resetDocToView } from './ViewDocument/ViewDocumentSlice';
import { resetDocToSign } from './SignDocument/SignDocumentSlice';
import { Box, Button, Container, Heading, Text } from 'gestalt';
import 'gestalt/dist/gestalt.css';

const Welcome = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(resetDocToView());
    dispatch(resetDocToSign());
  }, [dispatch]);

  return (
    <div>
      <Container>
        <Box padding={6}>
          <Box padding={3} display="flex" justifyContent="center">
            <Heading size="lg">Welcome to PDFTron Sign App</Heading>
          </Box>
          <Box padding={3} display="flex" justifyContent="center">
            <Text size="lg">Create, prepare, and sign PDF documents with ease</Text>
          </Box>
        </Box>
        
        <Box padding={3}>
          <Heading size="md">Prepare Document for Signing</Heading>
        </Box>
        <Box padding={2}>
          <Button
            onClick={() => navigate('/assignUsers')}
            text="Start Document Preparation"
            color="blue"
            size="lg"
          />
        </Box>
        
        <Box padding={3}>
          <Heading size="md">Sign Document</Heading>
        </Box>
        <Box padding={2}>
          <Button
            onClick={() => navigate('/signDocument')}
            text="Sign Document"
            color="green"
            size="lg"
          />
        </Box>
        
        <Box padding={3}>
          <Heading size="md">View Document</Heading>
        </Box>
        <Box padding={2}>
          <Button
            onClick={() => navigate('/viewDocument')}
            text="View Document"
            color="gray"
            size="lg"
          />
        </Box>
      </Container>
    </div>
  );
};

export default Welcome;