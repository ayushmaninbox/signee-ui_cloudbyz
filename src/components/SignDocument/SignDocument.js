import React, { useRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { navigate } from '@reach/router';
import { Box, Column, Heading, Row, Stack, Button, Toast } from 'gestalt';
import { selectDocToSign } from './SignDocumentSlice';
import { setDocToView } from '../ViewDocument/ViewDocumentSlice';
import { useDispatch } from 'react-redux';
import WebViewer from '@pdftron/webviewer';
import 'gestalt/dist/gestalt.css';
import './SignDocument.css';

const SignDocument = () => {
  const [annotationManager, setAnnotationManager] = useState(null);
  const [annotPosition, setAnnotPosition] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const doc = useSelector(selectDocToSign);
  const dispatch = useDispatch();
  const viewer = useRef(null);

  useEffect(() => {
    WebViewer(
      {
        path: 'webviewer',
        disabledElements: [
          'ribbons',
          'toggleNotesButton',
          'searchButton',
          'menuButton',
          'rubberStampToolGroupButton',
          'stampToolGroupButton',
          'fileAttachmentToolGroupButton',
          'calloutToolGroupButton',
          'undo',
          'redo',
          'eraserToolButton'
        ],
      },
      viewer.current,
    ).then(async instance => {
      const { documentViewer, annotationManager, Annotations } = instance.Core;
      setAnnotationManager(annotationManager);

      instance.UI.setToolbarGroup('toolbarGroup-Insert');

      // Load document from blob or URL
      if (doc && doc.docRef) {
        if (doc.blob) {
          documentViewer.loadDocument(doc.blob);
        } else {
          documentViewer.loadDocument(doc.docRef);
        }
      } else {
        setToastMessage('No document to sign. Please prepare a document first.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          navigate('/');
        }, 3000);
        return;
      }

      const normalStyles = (widget) => {
        if (widget instanceof Annotations.TextWidgetAnnotation) {
          return {
            'background-color': '#a5c7ff',
            color: 'white',
          };
        } else if (widget instanceof Annotations.SignatureWidgetAnnotation) {
          return {
            border: '1px solid #a5c7ff',
          };
        }
      };

      annotationManager.addEventListener('annotationChanged', (annotations, action, { imported }) => {
        if (imported && action === 'add') {
          annotations.forEach(function(annot) {
            if (annot instanceof Annotations.WidgetAnnotation) {
              Annotations.WidgetAnnotation.getCustomStyles = normalStyles;
            }
          });
        }
      });
    });
  }, [doc]);

  const nextField = () => {
    if (!annotationManager) return;
    
    let annots = annotationManager.getAnnotationsList();
    if (annots[annotPosition]) {
      annotationManager.jumpToAnnotation(annots[annotPosition]);
      if (annots[annotPosition+1]) {
        setAnnotPosition(annotPosition+1);
      }
    }
  }

  const prevField = () => {
    if (!annotationManager) return;
    
    let annots = annotationManager.getAnnotationsList();
    if (annots[annotPosition]) {
      annotationManager.jumpToAnnotation(annots[annotPosition]);
      if (annots[annotPosition-1]) {
        setAnnotPosition(annotPosition-1);
      }
    }
  }

  const completeSigning = async () => {
    if (!annotationManager) return;
    
    try {
      const xfdf = await annotationManager.exportAnnotations({ widgets: false, links: false });
      
      // Store signed document for viewing
      dispatch(setDocToView({ 
        docRef: doc.docRef, 
        docId: 'signed-document',
        blob: doc.blob,
        xfdf: xfdf
      }));
      
      setToastMessage('Document signed successfully! Redirecting to view...');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/viewDocument');
      }, 2000);
    } catch (error) {
      setToastMessage('Error signing document. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }

  return (
    <div className={'prepareDocument'}>
      <Box display="flex" direction="row" flex="grow">
        <Column span={2}>
          <Box padding={3}>
            <Heading size="md">Sign Document</Heading>
          </Box>
          <Box padding={3}>
            <Row gap={1}>
              <Stack>
                <Box padding={2}>
                  <Button
                    onClick={nextField}
                    accessibilityLabel="next field"
                    text="Next field"
                    iconEnd="arrow-forward"
                  />
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={prevField}
                    accessibilityLabel="Previous field"
                    text="Previous field"
                    iconEnd="arrow-back"
                  />
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={completeSigning}
                    accessibilityLabel="complete signing"
                    text="Complete signing"
                    iconEnd="compose"
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
          <Toast color="green" text={toastMessage} />
        )}
      </Box>
    </div>
  );
};

export default SignDocument;