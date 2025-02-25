/*
 * Copyright 2015-2022 The OpenZipkin Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

import { Trans } from '@lingui/macro';
import { Button, makeStyles, Menu, MenuItem } from '@material-ui/core';
import { Menu as MenuIcon } from '@material-ui/icons';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import * as api from '../../../constants/api';
import AdjustedTrace from '../../../models/AdjustedTrace';
import { setAlert } from '../../App/slice';
import { useUiConfig } from '../../UiConfig';

const useStyles = makeStyles(() => ({
  iconButton: {
    minWidth: 32,
    width: 32,
    height: 32,
  },
}));

type HeaderMenuProps = {
  trace: AdjustedTrace;
};

export const HeaderMenu = ({ trace }: HeaderMenuProps) => {
  const classes = useStyles();
  const config = useUiConfig();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const logsUrl = config.logsUrl
    ? config.logsUrl.replace(/{traceId}/g, trace.traceId)
    : undefined;
  const traceJsonUrl = `${api.TRACE}/${trace.traceId}`;
  const archivePostUrl = config.archivePostUrl
    ? config.archivePostUrl
    : undefined;
  const archiveUrl = config.archiveUrl
    ? config.archiveUrl.replace('{traceId}', trace.traceId)
    : undefined;

  const handleMenuButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleArchiveButtonClick = useCallback(() => {
    // We don't store the raw json in the browser yet, so we need to make an
    // HTTP call to retrieve it again.
    fetch(`${api.TRACE}/${trace.traceId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch trace from backend');
        }
        return response.json();
      })
      .then((json) => {
        // Add zipkin.archived tag to root span
        /* eslint-disable-next-line no-restricted-syntax */
        for (const span of json) {
          if ('parentId' in span === false) {
            const tags = span.tags || {};
            tags['zipkin.archived'] = 'true';
            span.tags = tags;
            break;
          }
        }
        return json;
      })
      .then((json) => {
        return fetch(archivePostUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(json),
        });
      })
      .then((response) => {
        if (
          !response.ok ||
          (response.status !== 202 && response.status === 200)
        ) {
          throw new Error('Failed to archive the trace');
        }
        if (archiveUrl) {
          dispatch(
            setAlert({
              message: `Archive successful! This trace is now accessible at ${archiveUrl}`,
              severity: 'success',
            }),
          );
        } else {
          dispatch(
            setAlert({
              message: `Archive successful!`,
              severity: 'success',
            }),
          );
        }
      })
      .catch(() => {
        dispatch(
          setAlert({
            message: 'Failed to archive the trace',
            severity: 'error',
          }),
        );
      });
  }, [archivePostUrl, archiveUrl, dispatch, trace.traceId]);

  return (
    <>
      <Button
        variant="outlined"
        className={classes.iconButton}
        onClick={handleMenuButtonClick}
      >
        <MenuIcon fontSize="small" />
      </Button>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {traceJsonUrl && (
          <MenuItem
            onClick={handleMenuClose}
            component="a"
            href={traceJsonUrl}
            target="_blank"
            rel="noopener"
          >
            <Trans>Download JSON</Trans>
          </MenuItem>
        )}
        {logsUrl && (
          <MenuItem
            onClick={handleMenuClose}
            component="a"
            href={logsUrl}
            target="_blank"
            rel="noopener"
          >
            <Trans>View Logs</Trans>
          </MenuItem>
        )}
        {archivePostUrl && (
          <MenuItem onClick={handleArchiveButtonClick}>
            <Trans>Archive Trace</Trans>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
