import React, { useRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { navigate } from '@reach/router';
import { Box, Column, Heading, Row, Stack, Button, Toast } from 'gestalt';
import { selectDocToView } from './ViewDocumentSlice';
import WebViewer from '@pdftron/webviewer';
import 'gestalt/dist/gestalt.css';
import './ViewDocument.css';

const ViewDocument = () => {
  const [instance, setInstance] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const doc = useSelector(selectDocToView);
  const viewer = useRef(null);

  useEffect(() => {
    WebViewer(
      {
        path: 'webviewer',
        disabledElements: [
          'ribbons',
          'toggleNotesButton',
          'contextMenuPopup',
        ],
      },
      viewer.current,
    ).then(async instance => {
      instance.UI.setToolbarGroup('toolbarGroup-View');
      setInstance(instance);

      // Load document
      if (doc && doc.docRef) {
        if (doc.blob) {
          instance.Core.documentViewer.loadDocument(doc.blob);
        } else {
          instance.Core.documentViewer.loadDocument(doc.docRef);
        }
        
        // Import annotations if available
        if (doc.xfdf) {
          instance.Core.documentViewer.addEventListener('documentLoaded', () => {
            instance.Core.annotationManager.importAnnotations(doc.xfdf);
          });
        }
      } else {
        setToastMessage('No document to view. Please prepare or sign a document first.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          navigate('/');
        }, 3000);
      }
    });
  }, [doc]);

  const download = () => {
    if (instance) {
      instance.UI.downloadPdf(true);
    }
  };

  const doneViewing = async () => {
    navigate('/');
  }

  return (
    <div className={'prepareDocument'}>
      <Box display="flex" direction="row" flex="grow">
        <Column span={2}>
          <Box padding={3}>
            <Heading size="md">View Document</Heading>
          </Box>
          <Box padding={3}>
            <Row gap={1}>
              <Stack>
                <Box padding={2}>
                  <Button
                    onClick={download}
                    accessibilityLabel="download signed document"
                    text="Download"
                    iconEnd="download"
                  />
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={doneViewing}
                    accessibilityLabel="complete viewing"
                    text="Done viewing"
                    iconEnd="check"
                  />
                </Box>
              </Stack>
            </Row>
          </Box>
        </Column>
        <Column span={10}>
          <div className="webviewer" ref={viewer}></div>
        </Column>
      </Box>
      <Box
        fit
        dangerouslySetInlineStyle={{
          __style: {
            bottom: 50,
            left: '50%',
            transform: 'translateX(-50%)',
          },
        }}
        paddingX={1}
        position="fixed"
      >
        {showToast && (
          <Toast color="red" text={toastMessage} />
        )}
      </Box>
    </div>
  );
};

export default ViewDocument;