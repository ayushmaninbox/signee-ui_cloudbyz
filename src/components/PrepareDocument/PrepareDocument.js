import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { navigate } from '@reach/router';
import {
  Box,
  Column,
  Heading,
  Row,
  Stack,
  Text,
  Button,
  SelectList,
  Toast,
} from 'gestalt';
import { selectAssignees, resetSignee } from '../Assign/AssignSlice';
import { setDocToSign } from '../SignDocument/SignDocumentSlice';
import WebViewer from '@pdftron/webviewer';
import 'gestalt/dist/gestalt.css';
import './PrepareDocument.css';

const PrepareDocument = () => {
  const [instance, setInstance] = useState(null);
  const [dropPoint, setDropPoint] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const dispatch = useDispatch();

  const assignees = useSelector(selectAssignees);
  const assigneesValues = assignees.map(user => {
    return { value: user.email, label: user.name };
  });
  let initialAssignee =
    assigneesValues.length > 0 ? assigneesValues[0].value : '';
  const [assignee, setAssignee] = useState(initialAssignee);

  const viewer = useRef(null);
  const filePicker = useRef(null);

  useEffect(() => {
    WebViewer(
      {
        path: 'webviewer',
        disabledElements: [
          'ribbons',
          'toggleNotesButton',
          'searchButton',
          'menuButton',
        ],
      },
      viewer.current,
    ).then(instance => {
      const { iframeWindow } = instance.UI;

      instance.UI.setToolbarGroup('toolbarGroup-View');
      setInstance(instance);

      const iframeDoc = iframeWindow.document.body;
      iframeDoc.addEventListener('dragover', dragOver);
      iframeDoc.addEventListener('drop', e => {
        drop(e, instance);
      });

      filePicker.current.onchange = e => {
        const file = e.target.files[0];
        if (file) {
          instance.UI.loadDocument(file);
        }
      };
    });
  }, []);

  const applyFields = async () => {
    if (!instance) {
      setToastMessage('Please upload a document first');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const { Annotations, documentViewer } = instance.Core;
    const annotationManager = documentViewer.getAnnotationManager();
    const fieldManager = annotationManager.getFieldManager();
    const annotationsList = annotationManager.getAnnotationsList();
    const annotsToDelete = [];
    const annotsToDraw = [];

    await Promise.all(
      annotationsList.map(async (annot, index) => {
        let inputAnnot;
        let field;

        if (typeof annot.custom !== 'undefined') {
          if (annot.custom.type === 'TEXT') {
            field = new Annotations.Forms.Field(
              annot.getContents() + Date.now() + index,
              {
                type: 'Tx',
                value: annot.custom.value,
              },
            );
            inputAnnot = new Annotations.TextWidgetAnnotation(field);
          } else if (annot.custom.type === 'SIGNATURE') {
            field = new Annotations.Forms.Field(
              annot.getContents() + Date.now() + index,
              {
                type: 'Sig',
              },
            );
            inputAnnot = new Annotations.SignatureWidgetAnnotation(field, {
              appearance: '_DEFAULT',
              appearances: {
                _DEFAULT: {
                  Normal: {
                    data:
                      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC',
                    offset: {
                      x: 100,
                      y: 100,
                    },
                  },
                },
              },
            });
          } else if (annot.custom.type === 'DATE') {
            field = new Annotations.Forms.Field(
              annot.getContents() + Date.now() + index,
              {
                type: 'Tx',
                value: 'm-d-yyyy',
                actions: {
                  F: [
                    {
                      name: 'JavaScript',
                      javascript: 'AFDate_FormatEx("mmm d, yyyy");',
                    },
                  ],
                  K: [
                    {
                      name: 'JavaScript',
                      javascript: 'AFDate_FormatEx("mmm d, yyyy");',
                    },
                  ],
                },
              },
            );
            inputAnnot = new Annotations.DatePickerWidgetAnnotation(field);
          } else {
            annotationManager.deleteAnnotation(annot, false, true);
            return;
          }
        } else {
          return;
        }

        inputAnnot.PageNumber = annot.getPageNumber();
        inputAnnot.X = annot.getX();
        inputAnnot.Y = annot.getY();
        inputAnnot.rotation = annot.Rotation;
        if (annot.Rotation === 0 || annot.Rotation === 180) {
          inputAnnot.Width = annot.getWidth();
          inputAnnot.Height = annot.getHeight();
        } else {
          inputAnnot.Width = annot.getHeight();
          inputAnnot.Height = annot.getWidth();
        }

        annotsToDelete.push(annot);

        Annotations.WidgetAnnotation.getCustomStyles = function (widget) {
          if (widget instanceof Annotations.SignatureWidgetAnnotation) {
            return {
              border: '1px solid #a5c7ff',
            };
          }
        };
        Annotations.WidgetAnnotation.getCustomStyles(inputAnnot);

        annotationManager.addAnnotation(inputAnnot);
        fieldManager.addField(field);
        annotsToDraw.push(inputAnnot);
      }),
    );

    annotationManager.deleteAnnotations(annotsToDelete, null, true);
    await annotationManager.drawAnnotationsFromList(annotsToDraw);
    
    // Store document data for signing
    const doc = documentViewer.getDocument();
    const data = await doc.getFileData();
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    dispatch(setDocToSign({ 
      docRef: url, 
      docId: 'prepared-document',
      blob: blob 
    }));
    dispatch(resetSignee());
    
    setToastMessage('Document prepared successfully! Redirecting to sign...');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate('/signDocument');
    }, 2000);
  };

  const addField = (type, point = {}, name = '', value = '', flag = {}) => {
    if (!instance) return;
    
    const { documentViewer, Annotations } = instance.Core;
    const annotationManager = documentViewer.getAnnotationManager();
    const doc = documentViewer.getDocument();
    const displayMode = documentViewer.getDisplayModeManager().getDisplayMode();
    const page = displayMode.getSelectedPages(point, point);
    if (!!point.x && page.first == null) {
      return;
    }
    const page_idx =
      page.first !== null ? page.first : documentViewer.getCurrentPage();
    const page_info = doc.getPageInfo(page_idx);
    const page_point = displayMode.windowToPage(point, page_idx);
    const zoom = documentViewer.getZoomLevel();

    var textAnnot = new Annotations.FreeTextAnnotation();
    textAnnot.PageNumber = page_idx;
    const rotation = documentViewer.getCompleteRotation(page_idx) * 90;
    textAnnot.Rotation = rotation;
    if (rotation === 270 || rotation === 90) {
      textAnnot.Width = 50.0 / zoom;
      textAnnot.Height = 250.0 / zoom;
    } else {
      textAnnot.Width = 250.0 / zoom;
      textAnnot.Height = 50.0 / zoom;
    }
    textAnnot.X = (page_point.x || page_info.width / 2) - textAnnot.Width / 2;
    textAnnot.Y = (page_point.y || page_info.height / 2) - textAnnot.Height / 2;

    textAnnot.setPadding(new Annotations.Rect(0, 0, 0, 0));
    textAnnot.custom = {
      type,
      value,
      flag,
      name: `${assignee}_${type}_`,
    };

    textAnnot.setContents(textAnnot.custom.name);
    textAnnot.FontSize = '' + 20.0 / zoom + 'px';
    textAnnot.FillColor = new Annotations.Color(211, 211, 211, 0.5);
    textAnnot.TextColor = new Annotations.Color(0, 165, 228);
    textAnnot.StrokeThickness = 1;
    textAnnot.StrokeColor = new Annotations.Color(0, 165, 228);
    textAnnot.TextAlign = 'center';

    textAnnot.Author = annotationManager.getCurrentUser();

    annotationManager.deselectAllAnnotations();
    annotationManager.addAnnotation(textAnnot, true);
    annotationManager.redrawAnnotation(textAnnot);
    annotationManager.selectAnnotation(textAnnot);
  };

  const dragOver = e => {
    e.preventDefault();
    return false;
  };

  const drop = (e, instance) => {
    const { docViewer } = instance;
    const scrollElement = docViewer.getScrollViewElement();
    const scrollLeft = scrollElement.scrollLeft || 0;
    const scrollTop = scrollElement.scrollTop || 0;
    setDropPoint({ x: e.pageX + scrollLeft, y: e.pageY + scrollTop });
    e.preventDefault();
    return false;
  };

  const dragStart = e => {
    e.target.style.opacity = 0.5;
    const copy = e.target.cloneNode(true);
    copy.id = 'form-build-drag-image-copy';
    copy.style.width = '250px';
    document.body.appendChild(copy);
    e.dataTransfer.setDragImage(copy, 125, 25);
    e.dataTransfer.setData('text', '');
  };

  const dragEnd = (e, type) => {
    addField(type, dropPoint);
    e.target.style.opacity = 1;
    document.body.removeChild(
      document.getElementById('form-build-drag-image-copy'),
    );
    e.preventDefault();
  };

  return (
    <div className={'prepareDocument'}>
      <Box display="flex" direction="row" flex="grow">
        <Column span={2}>
          <Box padding={3}>
            <Heading size="md">Prepare Document</Heading>
          </Box>
          <Box padding={3}>
            <Row gap={1}>
              <Stack>
                <Box padding={2}>
                  <Text>{'Step 1'}</Text>
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={() => {
                      if (filePicker) {
                        filePicker.current.click();
                      }
                    }}
                    accessibilityLabel="upload a document"
                    text="Upload a document"
                    iconEnd="add-circle"
                  />
                </Box>
              </Stack>
            </Row>
            <Row>
              <Stack>
                <Box padding={2}>
                  <Text>{'Step 2'}</Text>
                </Box>
                <Box padding={2}>
                  <SelectList
                    id="assigningFor"
                    name="assign"
                    onChange={({ value }) => setAssignee(value)}
                    options={assigneesValues}
                    placeholder="Select recipient"
                    label="Adding signature for"
                    value={assignee}
                  />
                </Box>
                <Box padding={2}>
                  <div
                    draggable
                    onDragStart={e => dragStart(e)}
                    onDragEnd={e => dragEnd(e, 'SIGNATURE')}
                  >
                    <Button
                      onClick={() => addField('SIGNATURE')}
                      accessibilityLabel="add signature"
                      text="Add signature"
                      iconEnd="compose"
                    />
                  </div>
                </Box>
                <Box padding={2}>
                  <div
                    draggable
                    onDragStart={e => dragStart(e)}
                    onDragEnd={e => dragEnd(e, 'TEXT')}
                  >
                    <Button
                      onClick={() => addField('TEXT')}
                      accessibilityLabel="add text"
                      text="Add text"
                      iconEnd="text-sentence-case"
                    />
                  </div>
                </Box>
                <Box padding={2}>
                  <div
                    draggable
                    onDragStart={e => dragStart(e)}
                    onDragEnd={e => dragEnd(e, 'DATE')}
                  >
                    <Button
                      onClick={() => addField('DATE')}
                      accessibilityLabel="add date field"
                      text="Add date"
                      iconEnd="calendar"
                    />
                  </div>
                </Box>
              </Stack>
            </Row>
            <Row gap={1}>
              <Stack>
                <Box padding={2}>
                  <Text>{'Step 3'}</Text>
                </Box>
                <Box padding={2}>
                  <Button
                    onClick={applyFields}
                    accessibilityLabel="Prepare for signing"
                    text="Prepare for Signing"
                    iconEnd="send"
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
      <input type="file" ref={filePicker} style={{ display: 'none' }} />
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

export default PrepareDocument;