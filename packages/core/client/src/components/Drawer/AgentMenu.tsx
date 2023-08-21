import { useState } from 'react'
import { styled } from '@mui/material/styles'
import Avatar from '@mui/material/Avatar'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import MoreIcon from '@mui/icons-material/MoreVert'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import { useNavigate } from 'react-router-dom'
import { IconBtn } from '@magickml/client-core'
import { Close, Done, } from '@mui/icons-material'
import styles from "./menu.module.css"
import { useConfig } from '@magickml/client-core'
import { enqueueSnackbar } from 'notistack'
import { useSelector } from 'react-redux'
import { Modal } from '@magickml/client-core'
import { DEFAULT_USER_TOKEN, STANDALONE, PRODUCTION } from '@magickml/config'

function AgentMenu({ data,resetData }) {
  const navigate = useNavigate()
  const [openMenu1, setOpenMenu1] = useState(null)
  const [openConfirm, setOpenConfirm] = useState<boolean>(false)
  const [openMenu2, setOpenMenu2] = useState(null)
  const [editMode, setEditMode] = useState<boolean>(false)
  const [oldName, setOldName] = useState<string>('')
  const [selectedAgentData, setSelectedAgentData] = useState<any>()
  const globalConfig = useSelector((state: any) => state.globalConfig)
  const token = globalConfig?.token
  const config = useConfig()

  const handleClose = () => {
    setOpenConfirm(false)

  }

  const onSubmit = () => {
    handleDelete(selectedAgentData.id)
    setOpenConfirm(false)
  }


  const BorderedAvatar = styled(Avatar)`
    border: 1px solid lightseagreen;
  `


  const handleToggleMenu1 = event => {
    setOpenMenu1(event.currentTarget)
  }

  const handleCloseMenu1 = () => {
    setOpenMenu1(null)
  }

  const handleToggleMenu2 = (agent, event) => {
    setOpenMenu2(event.currentTarget)
    setSelectedAgentData(agent)
  }

  const handleCloseMenu2 = () => {
    setOpenMenu2(null)
  }
  const update = (id: string, data = undefined) => {
    const _data = data || { ...selectedAgentData }
    id = id || _data.id
    if (_data['id']) {
      delete _data.id
      delete _data?.dirty
    }

    // Avoid server-side validation error
    _data.enabled = _data.enabled ? true : false
    _data.updatedAt = new Date().toISOString()
    _data.secrets = _data.secrets ? _data.secrets : '{}'

    fetch(`${config.apiUrl}/agents/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(_data),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .then(data => {
        enqueueSnackbar('Updated agent', {
          variant: 'success',
        })
        setSelectedAgentData(data)

        // update data instead of refetching data to avoid agent window flashes
        // updateData(data)
      })
      .catch(e => {
        console.error('ERROR', e)
        enqueueSnackbar(e, {
          variant: 'error',
        })
      })
  }
  const handleDelete = (id: string) => {
    fetch(`${config.apiUrl}/agents/` + id, {
      method: 'DELETE',
      headers: STANDALONE
        ? { Authorization: `Bearer ${DEFAULT_USER_TOKEN}` }
        : { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        res = await res.json()
        // TODO: Handle internal error
        // if (res === 'internal error') {
        //   enqueueSnackbar('Server Error deleting agent with id: ' + id, {
        //     variant: 'error',
        //   })
        // } else {
        enqueueSnackbar('Agent with id: ' + id + ' deleted successfully', {
          variant: 'success',
        })
        // }
        if (selectedAgentData.id === id) setSelectedAgentData(undefined)
        resetData()
      })
      .catch(e => {
        enqueueSnackbar('Server Error deleting entity with id: ' + id, {
          variant: 'error',
        })
      })
  }

  const StyledDivider = styled(Divider)(({ theme }) => ({
    backgroundColor: 'black',
    marginTop: '4px',
    marginBottom: '4px',
  }))

  const handleSelectAgent = agent => {
  }

  return (
    <div>
      <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <ListItem
          alignItems="center"
          sx={{
            px: 1,
            py: 0,
            width: 200,
            justifyContent: 'space-between',
          }}
        >
          <ListItemAvatar>
            <BorderedAvatar
              alt="Remy Sharp"
              src="https://c4.wallpaperflare.com/wallpaper/452/586/387/artwork-fantasy-art-wizard-books-skull-hd-wallpaper-preview.jpg"
              sx={{ width: 30, height: 30 }}
            />
          </ListItemAvatar>
          <ListItemText primary="Agent name" />
          <IconButton
            aria-label="expand"
            size="small"
            onClick={handleToggleMenu1}
          >
            <ExpandMoreIcon sx={{ placeContent: 'end' }} />
          </IconButton>
        </ListItem>
      </List>
      {/* select agent modal 1 */}
      <Menu
        id="menu1"
        anchorEl={openMenu1}
        open={Boolean(openMenu1)}
        onClose={handleCloseMenu1}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiMenu-paper': {
            background: '#2B2B30',
            width: '210px',
            shadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
            borderRadius: '0px',
            left: '0px !important',
          },
        }}
      >
        {data?.map((agent, i) => {
          return (
            <>
              <MenuItem
                sx={{
                  px: 1,
                  py: 0,
                  width: 200,
                  justifyContent: 'space-between',
                  '&:hover, &:focus': {
                    background: 'none',
                    outline: 'none',
                  },
                }}
                key={i}
                onClick={() => handleSelectAgent(agent)}
              >
                {
                  editMode && selectedAgentData?.id === agent?.id ? (
                    <>
                      <input
                        type="text"
                        name="name"
                        className={styles.inputEdit}
                        value={selectedAgentData.name}
                        onChange={e =>
                          setSelectedAgentData({
                            ...selectedAgentData,
                            name: e.target.value,
                          })
                        }
                        placeholder="Add new agent name here"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            update(selectedAgentData.id)
                            setEditMode(false)
                            setOldName('')
                          }
                        }}
                      />
                      <IconBtn
                        label={'Done'}
                        Icon={<Done />}
                        onClick={e => {
                          update(selectedAgentData.id)
                          setEditMode(false)
                          setOldName('')
                        }}
                      />
                      <IconBtn
                        label={'close'}
                        Icon={<Close />}
                        onClick={e => {
                          setSelectedAgentData({ ...selectedAgentData, name: oldName })
                          setOldName('')
                          setEditMode(false)
                        }}
                      />
                    </>
                  ) : (

                    <ListItemAvatar
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <BorderedAvatar
                        alt={agent?.name?.at(0) || 'A'}
                        src={agent.image ? agent.name : (agent?.name?.at(0) || 'A')}
                        sx={{ width: 24, height: 24 }}
                      />
                      <ListItemText primary={agent?.name} sx={{ ml: 2 }} />
                    </ListItemAvatar>
                  )


                }
                <ListItemIcon sx={{ placeContent: 'end' }}>
                  <MoreIcon
                    fontSize="small"
                    onClick={(event) => handleToggleMenu2(agent, event)}
                    aria-controls="menu2"
                    aria-haspopup="true"
                  />
                </ListItemIcon>
              </MenuItem>
              <StyledDivider />
            </>
          )
        })}

        <MenuItem
          sx={{
            px: 1,
            py: 0,
            '&:hover, &:focus': {
              background: 'none',
              outline: 'none',
            },
          }}
          onClick={() => {
            navigate(`/magick/Agents-${encodeURIComponent(btoa('Agents'))}`)
          }}
        >
          <List
            sx={{
              px: 0,
              py: 0,
            }}
          >
            <ListItem
              sx={{
                px: 0,
                py: 0,
              }}

            >
              <AddCircleIcon
                sx={{
                  mr: 1,
                }}
              />
              <ListItemText primary="Create New Agent" />
            </ListItem>
          </List>
        </MenuItem>
      </Menu>
      {/* select agent modal 2 */}
      <Menu
        id="menu2"
        anchorEl={openMenu2}
        open={Boolean(openMenu2)}
        onClose={handleCloseMenu2}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiMenu-paper': {
            background: '#2B2B30',
            width: '170px',
            shadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
            borderRadius: '0px',
          },
        }}
      >
        <MenuItem sx={{ py: 0 }}
          onClick={e => {
            setEditMode(true)
            setOldName(selectedAgentData.name)
            handleCloseMenu2()
          }}
        >Rename</MenuItem>
        <StyledDivider />
        <MenuItem sx={{ py: 0 }}
          onClick={e => {
            setOpenConfirm(true)
            handleCloseMenu2()
          }
          }
        >Delete</MenuItem>
        <StyledDivider />
        <MenuItem sx={{ py: 0 }}>Change Image</MenuItem>
        <StyledDivider />
        <MenuItem sx={{ py: 0 }}>Other Options</MenuItem>
      </Menu>
      {selectedAgentData && (<Modal
        open={openConfirm}
        onClose={handleClose}
        handleAction={onSubmit}
        title={`Delete ${selectedAgentData ? selectedAgentData.name : ""}  agent`}
        submitText="Confirm"
        children="Do you want to delete this agent?"
      />)}
    </div>
  )
}

export default AgentMenu
